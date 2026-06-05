const STORAGE_KEY = "swipe-todo-prototype-v1";
const $ = (selector) => document.querySelector(selector);
let supabaseClient = null;
let signedInUser = null;
let cloudSyncTimer = null;
let checkedSignupEmail = "";
let displayName = "";
let signupOnboarding = false;
let pendingSignupState = null;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthKey = (date) => toDateKey(date).slice(0, 7);

const dayOffset = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const monthFromKey = (monthKey) => new Date(`${monthKey}-01T00:00:00`);

const shiftMonth = (monthKey, months) => {
  const date = monthFromKey(monthKey);
  date.setMonth(date.getMonth() + months);
  return toMonthKey(date);
};

const newId = () => crypto.randomUUID();

const createEmptyState = () => ({
  today: [],
  daily: [],
  planned: [],
  lists: [],
  selectedDate: toDateKey(dayOffset(0)),
  openedListId: null,
  listReturnView: "today-view",
  copiedList: null,
  lastDailyDate: toDateKey(dayOffset(0))
});

const sampleState = () => ({
  today: [
    { id: newId(), date: toDateKey(dayOffset(0)), title: "서류 제출하기", completed: false },
    { id: newId(), date: toDateKey(dayOffset(0)), title: "영양제 먹기", completed: true }
  ],
  daily: [
    { id: newId(), title: "영양제 먹기", active: true },
    { id: newId(), title: "스트레칭 10분", active: true },
    { id: newId(), title: "물 마시기", active: false }
  ],
  planned: [
    { id: newId(), date: toDateKey(dayOffset(3)), title: "미용실 예약" }
  ],
  lists: [
    {
      id: newId(),
      title: "장보기",
      date: toDateKey(dayOffset(0)),
      items: [
        { id: newId(), title: "우유", completed: false },
        { id: newId(), title: "사과", completed: false },
        { id: newId(), title: "주방세제", completed: true },
        { id: newId(), title: "계란", completed: false }
      ]
    },
    {
      id: newId(),
      title: "지난 장보기",
      date: toDateKey(dayOffset(-2)),
      items: [
        { id: newId(), title: "두부", completed: true },
        { id: newId(), title: "김치", completed: true }
      ]
    },
    {
      id: newId(),
      title: "여행 준비",
      date: toDateKey(dayOffset(3)),
      items: [
        { id: newId(), title: "보조 배터리", completed: false },
        { id: newId(), title: "여권", completed: false }
      ]
    }
  ],
  selectedDate: toDateKey(dayOffset(3)),
  openedListId: null,
  listReturnView: "today-view",
  copiedList: null,
  samplePastListAdded: true,
  lastDailyDate: toDateKey(dayOffset(0))
});

const normalizeTodayTasks = (loaded) => {
  const fallbackDate = loaded?.lastDailyDate || toDateKey(dayOffset(0));
  if (!Array.isArray(loaded?.today)) return [];
  return loaded.today.map((task) => ({
    ...task,
    date: task.date || fallbackDate
  }));
};

const normalizeState = (loaded) => ({
  ...createEmptyState(),
  ...loaded,
  today: normalizeTodayTasks(loaded),
  daily: Array.isArray(loaded?.daily) ? loaded.daily : [],
  planned: Array.isArray(loaded?.planned) ? loaded.planned : [],
  lists: Array.isArray(loaded?.lists) ? loaded.lists : [],
  copiedList: Object.prototype.hasOwnProperty.call(loaded || {}, "copiedList") ? loaded.copiedList : null
});

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return createEmptyState();
  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return createEmptyState();
  }
};

let state = loadState();
let draftList = null;
let editingDraft = false;
const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleCloudSync();
};

const showStatus = (message) => {
  $("#status-message").textContent = message;
};

const hasTodoData = (candidate) => Boolean(
  candidate.today.length ||
  candidate.daily.length ||
  candidate.planned.length ||
  candidate.lists.length
);

const showAuthMessage = (target, message) => {
  const node = $(`#${target}-message`);
  if (node) node.textContent = message;
};

const withBusyButton = async (button, busyText, action) => {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
};

const loginErrorMessage = (error) => {
  if (error?.message?.includes("Email not confirmed")) {
    return "이전 미인증 계정이에요. 새 이메일로 가입해 주세요.";
  }
  if (error?.message?.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 맞지 않아요.";
  }
  return error?.message || "로그인할 수 없어요.";
};

const renderAccount = () => {
  const status = $("#account-status");
  if (!status) return;
  const signedIn = Boolean(signedInUser);
  status.textContent = signedIn ? `${displayName || signedInUser.email}에 저장됨` : "이 기기에 저장됨";
  $("#today-title").textContent = signedIn && displayName ? `${displayName}의 하루` : "오늘";
  $("#daily-title").textContent = signedIn && displayName ? `${displayName}의 데일리루틴` : "데일리루틴";
  $("#plan-title").textContent = signedIn && displayName ? `${displayName}의 계획` : "계획";
  $("#open-login-button").hidden = signedIn;
  $("#open-signup-button").hidden = signedIn;
  $("#logout-button").hidden = !signedIn;
};

const loadProfile = async () => {
  if (!supabaseClient || !signedInUser) return;
  const { data } = await supabaseClient
    .from("profiles")
    .select("nickname")
    .eq("user_id", signedInUser.id)
    .maybeSingle();
  displayName = data?.nickname || "";
  renderAccount();
};

const uploadCloudState = async () => {
  if (!supabaseClient || !signedInUser) return;
  const { error } = await supabaseClient
    .from("todo_states")
    .upsert({
      user_id: signedInUser.id,
      payload: state,
      updated_at: new Date().toISOString()
    });
  if (error) {
    showStatus("기기에는 저장됐지만 클라우드 동기화에 실패했어요.");
    return;
  }
  showStatus("클라우드에 저장됐어요.");
};

function scheduleCloudSync() {
  if (!supabaseClient || !signedInUser || typeof window === "undefined") return;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(uploadCloudState, 500);
}

const loadCloudState = async () => {
  if (!supabaseClient || !signedInUser) return;
  const { data, error } = await supabaseClient
    .from("todo_states")
    .select("payload")
    .eq("user_id", signedInUser.id)
    .maybeSingle();
  if (error) {
    showStatus("클라우드 데이터를 불러오지 못했어요.");
    return;
  }
  if (data?.payload) {
    state = normalizeState(data.payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    refreshActiveView();
    showStatus("클라우드 데이터를 불러왔어요.");
    return;
  }
  await uploadCloudState();
};

const applySession = async (session) => {
  signedInUser = session?.user || null;
  renderAccount();
  if (signedInUser && !signupOnboarding) {
    await loadProfile();
    await loadCloudState();
  }
};

const submitLogin = async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthMessage("login", "클라우드 설정이 필요해요.");
    return;
  }
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  const button = event.currentTarget.querySelector('button[type="submit"]');
  showAuthMessage("login", "로그인 중...");
  const { data, error } = await withBusyButton(button, "확인 중", () =>
    supabaseClient.auth.signInWithPassword({ email, password })
  );
  if (error) {
    showAuthMessage("login", loginErrorMessage(error));
    return;
  }
  showAuthMessage("login", "");
  await applySession(data.session);
  if (!displayName) {
    signupOnboarding = true;
    pendingSignupState = null;
    activateView("profile-view");
    return;
  }
  activateView("today-view");
};

const submitSignup = async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthMessage("signup", "클라우드 설정이 필요해요.");
    return;
  }
  const email = $("#signup-email").value.trim();
  const password = $("#signup-password").value;
  const passwordConfirm = $("#signup-password-confirm").value;
  if (checkedSignupEmail !== email.toLowerCase()) {
    showAuthMessage("signup", "이메일 중복확인을 해주세요.");
    return;
  }
  if (password.length < 8) {
    showAuthMessage("signup", "비밀번호는 8자 이상이에요.");
    return;
  }
  if (password !== passwordConfirm) {
    showAuthMessage("signup", "비밀번호가 같지 않아요.");
    return;
  }
  pendingSignupState = normalizeState(state);
  signupOnboarding = true;
  const button = event.currentTarget.querySelector('button[type="submit"]');
  showAuthMessage("signup", "가입 중...");
  const { data, error } = await withBusyButton(button, "가입 중", () =>
    supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.SWIPE_TODO_SUPABASE.redirectUrl
      }
    })
  );
  if (error) {
    signupOnboarding = false;
    pendingSignupState = null;
    showAuthMessage("signup", error.message.includes("already") ? "이미 가입된 이메일이에요." : "가입 정보를 확인해 주세요.");
    return;
  }
  if (data.session) {
    signedInUser = data.session.user;
    renderAccount();
    $("#profile-nickname").value = "";
    activateView("profile-view");
    return;
  }
  signupOnboarding = false;
  pendingSignupState = null;
  showAuthMessage("signup", "가입됐어요. 로그인해 주세요.");
};

const submitProfile = async (event) => {
  event.preventDefault();
  const nickname = $("#profile-nickname").value.trim();
  if (!nickname) {
    showAuthMessage("profile", "별명을 입력해 주세요.");
    return;
  }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  showAuthMessage("profile", "저장 중...");
  const { error } = await withBusyButton(button, "저장 중", () =>
    supabaseClient.from("profiles").upsert({
      user_id: signedInUser.id,
      nickname,
      updated_at: new Date().toISOString()
    })
  );
  if (error) {
    showAuthMessage("profile", "별명을 저장하지 못했어요.");
    return;
  }
  displayName = nickname;
  if (hasTodoData(pendingSignupState || createEmptyState())) {
    renderAccount();
    activateView("import-choice-view");
    return;
  }
  await finishSignupOnboarding(false);
};

const finishSignupOnboarding = async (importLocal) => {
  state = importLocal && pendingSignupState ? pendingSignupState : createEmptyState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  await uploadCloudState();
  signupOnboarding = false;
  pendingSignupState = null;
  renderAccount();
  activateView("today-view");
};

const checkSignupEmail = async () => {
  const email = $("#signup-email").value.trim().toLowerCase();
  checkedSignupEmail = "";
  if (!email) {
    showAuthMessage("signup", "이메일을 입력해 주세요.");
    return;
  }
  if (!supabaseClient) {
    showAuthMessage("signup", "클라우드 설정이 필요해요.");
    return;
  }
  const button = $("#email-check-button");
  showAuthMessage("signup", "확인 중...");
  const { data, error } = await withBusyButton(button, "확인 중", () =>
    supabaseClient.rpc("is_email_available", {
      candidate_email: email
    })
  );
  if (error) {
    showAuthMessage("signup", "중복확인을 할 수 없어요.");
    return;
  }
  if (!data) {
    showAuthMessage("signup", "이미 가입된 이메일이에요.");
    return;
  }
  checkedSignupEmail = email;
  showAuthMessage("signup", "사용 가능한 이메일이에요.");
};

const signOut = async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  signedInUser = null;
  displayName = "";
  signupOnboarding = false;
  pendingSignupState = null;
  state = createEmptyState();
  localStorage.removeItem(STORAGE_KEY);
  renderAccount();
  activateView("today-view");
  showStatus("로그아웃했어요.");
};

const initializeCloud = async () => {
  if (typeof window === "undefined") return;
  const config = window.SWIPE_TODO_SUPABASE;
  if (!window.supabase?.createClient || !config?.url || !config?.anonKey) {
    renderAccount();
    return;
  }
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data } = await supabaseClient.auth.getSession();
  await applySession(data.session);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
};

const formatDate = (dateKey, options = {}) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", options).format(date);
};

const activateView = (viewId) => {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  if (viewId === "today-view") renderToday();
  if (viewId === "daily-view") renderDaily();
  if (viewId === "plan-view") renderPlan();
  if (viewId === "list-view") renderList();
};

const refreshActiveView = () => {
  const activeView = $(".view.active")?.id || "today-view";
  activateView(activeView);
};

const todayKey = () => toDateKey(dayOffset(0));

const tasksForDate = (dateKey) => state.today.filter((task) => task.date === dateKey);

const openPlanForToday = () => {
  state.selectedDate = todayKey();
  persist();
  activateView("plan-view");
};

const isPastDate = (dateKey) => dateKey < todayKey();

const createDeleteButton = (onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete";
  button.textContent = "×";
  button.setAttribute("aria-label", "삭제");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
};

const appendItemActions = (row, deleteButton, orderControls = null) => {
  if (orderControls) row.append(orderControls);
  row.append(deleteButton);
};

const renderTask = (task, onCheck, onDelete, orderControls = null, readOnly = false) => {
  const row = document.createElement("article");
  row.className = "task";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.disabled = readOnly;
  if (!readOnly) checkbox.addEventListener("change", () => onCheck(task.id));
  const name = document.createElement("span");
  name.className = "task-name";
  name.textContent = task.title;
  row.append(checkbox, name);
  if (!readOnly) appendItemActions(row, createDeleteButton(() => onDelete(task.id)), orderControls);
  return row;
};

const createOrderControls = (title, index, length, onMove) => {
  const controls = document.createElement("div");
  controls.className = "order-controls";
  if (index > 0) {
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "▲";
    up.setAttribute("aria-label", `${title} 위로 이동`);
    up.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMove(-1);
    });
    controls.append(up);
  }
  if (index < length - 1) {
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "▼";
    down.setAttribute("aria-label", `${title} 아래로 이동`);
    down.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMove(1);
    });
    controls.append(down);
  }
  return controls;
};

const reorderVisibleItems = (items, visibleIds, id, distance) => {
  const position = visibleIds.indexOf(id);
  const destination = position + distance;
  if (position < 0 || destination < 0 || destination >= visibleIds.length) return false;
  const fromIndex = items.findIndex((item) => item.id === visibleIds[position]);
  const toIndex = items.findIndex((item) => item.id === visibleIds[destination]);
  [items[fromIndex], items[toIndex]] = [items[toIndex], items[fromIndex]];
  return true;
};

const renderToday = () => {
  const dateKey = todayKey();
  $("#today-date").textContent = formatDate(dateKey, { month: "long", day: "numeric" });
  const todayTasks = tasksForDate(dateKey);
  const incomplete = todayTasks.filter((task) => !task.completed);
  $("#today-count").textContent = `남은 일 ${incomplete.length}개`;
  const pendingNode = $("#today-items");
  const doneNode = $("#done-items");
  pendingNode.replaceChildren(...incomplete.map((task, index) => renderTask(
    task,
    toggleToday,
    deleteToday,
    createOrderControls(task.title, index, incomplete.length, (distance) => moveTodayItem(task.id, distance))
  )));
  doneNode.replaceChildren(...todayTasks.filter((task) => task.completed).map((task) => renderTask(task, toggleToday, deleteToday)));
  if (!incomplete.length) pendingNode.innerHTML = '<p class="empty">오늘 할 일을 모두 끝냈어요.</p>';

  const cards = state.lists.filter((list) => list.date <= dateKey && list.items.some((item) => !item.completed));
  $("#arrived-lists").replaceChildren(...cards.map((list, index) => {
    const completeCount = list.items.filter((item) => item.completed).length;
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `<div><p class="card-label">오늘 리스트</p><p>${list.title} ${completeCount} / ${list.items.length} 완료</p></div>`;
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "open-list";
    openButton.textContent = "열기";
    openButton.addEventListener("click", () => openList(list.id, "today-view"));
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(openButton, createOrderControls(
      list.title,
      index,
      cards.length,
      (distance) => moveArrivedList(list.id, distance)
    ));
    card.append(actions);
    return card;
  }));
};

const toggleToday = (id) => {
  const item = state.today.find((task) => task.id === id);
  item.completed = !item.completed;
  persist();
  renderToday();
};

const deleteToday = (id) => {
  state.today = state.today.filter((task) => task.id !== id);
  persist();
  renderToday();
};

const moveTodayItem = (itemId, distance) => {
  const ids = tasksForDate(todayKey()).filter((item) => !item.completed).map((item) => item.id);
  if (!reorderVisibleItems(state.today, ids, itemId, distance)) return;
  persist();
  renderToday();
};

const togglePlanToday = (id) => {
  const item = state.today.find((task) => task.id === id);
  item.completed = !item.completed;
  persist();
  renderPlan();
};

const deletePlanToday = (id) => {
  state.today = state.today.filter((task) => task.id !== id);
  persist();
  renderPlan();
};

const movePlanTodayItem = (itemId, distance) => {
  const ids = tasksForDate(state.selectedDate).filter((item) => !item.completed).map((item) => item.id);
  if (!reorderVisibleItems(state.today, ids, itemId, distance)) return;
  persist();
  renderPlan();
};

const renderDaily = () => {
  const root = $("#daily-items");
  root.replaceChildren(...state.daily.map((routine, index) => {
    const row = document.createElement("article");
    row.className = "daily-task";
    const title = document.createElement("span");
    title.textContent = routine.title;
    const controls = document.createElement("div");
    controls.className = "daily-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `switch ${routine.active ? "on" : ""}`;
    toggle.setAttribute("aria-label", `${routine.title} 반복 ${routine.active ? "끄기" : "켜기"}`);
    toggle.addEventListener("click", () => {
      routine.active = !routine.active;
      persist();
      renderDaily();
    });
    controls.append(
      toggle,
      createOrderControls(routine.title, index, state.daily.length, (distance) => moveDailyItem(routine.id, distance)),
      createDeleteButton(() => {
        state.daily = state.daily.filter((item) => item.id !== routine.id);
        persist();
        renderDaily();
      })
    );
    row.append(title, controls);
    return row;
  }));
};

const monthDates = (monthKey) => {
  const first = monthFromKey(monthKey);
  const finalDate = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length: finalDate }, (_, index) => {
    const date = new Date(first);
    date.setDate(index + 1);
    return date;
  });
};

const availableMonths = () => [0, 1, 2].map((offset) => shiftMonth(toMonthKey(dayOffset(0)), offset));

const chooseMonth = (monthKey) => {
  const todayKey = toDateKey(dayOffset(0));
  state.selectedDate = todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`;
  persist();
  renderPlan();
};

const changeSelectedDate = (days) => {
  const selected = new Date(`${state.selectedDate}T00:00:00`);
  selected.setDate(selected.getDate() + days);
  state.selectedDate = toDateKey(selected);
  persist();
  renderPlan();
};

const movePlannedList = (listId, distance) => {
  const ids = state.lists.filter((list) => list.date === state.selectedDate).map((list) => list.id);
  if (!reorderVisibleItems(state.lists, ids, listId, distance)) return;
  persist();
  renderPlan();
};

const movePlannedItem = (itemId, distance) => {
  const ids = state.planned.filter((item) => item.date === state.selectedDate).map((item) => item.id);
  if (!reorderVisibleItems(state.planned, ids, itemId, distance)) return;
  persist();
  renderPlan();
};

const moveArrivedList = (listId, distance) => {
  const today = todayKey();
  const ids = state.lists
    .filter((list) => list.date <= today && list.items.some((item) => !item.completed))
    .map((list) => list.id);
  if (!reorderVisibleItems(state.lists, ids, listId, distance)) return;
  persist();
  renderToday();
};

const moveDailyItem = (itemId, distance) => {
  const ids = state.daily.map((item) => item.id);
  if (!reorderVisibleItems(state.daily, ids, itemId, distance)) return;
  persist();
  renderDaily();
};

const renderPlan = () => {
  const months = displayedMonths();
  const selectedIsPast = isPastDate(state.selectedDate);
  const selectedIsToday = state.selectedDate === todayKey();
  $("#plan-view").classList.toggle("past-plan", selectedIsPast);
  $("#month-picker").replaceChildren(...months.map((monthKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-choice ${state.selectedDate.startsWith(monthKey) ? "active" : ""}`;
    button.textContent = formatDate(`${monthKey}-01`, { month: "long" });
    button.addEventListener("click", () => chooseMonth(monthKey));
    return button;
  }));

  $("#calendar-input").value = state.selectedDate;
  const picker = $("#date-picker");
  picker.replaceChildren(...monthDates(state.selectedDate.slice(0, 7)).map((date) => {
    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-choice ${dateKey === state.selectedDate ? "active" : ""} ${isPastDate(dateKey) ? "past" : ""}`;
    button.innerHTML = `<strong>${date.getDate()}</strong><small>${formatDate(dateKey, { weekday: "short" })}</small>`;
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      persist();
      renderPlan();
    });
    return button;
  }));
  const activeDate = picker.querySelector(".active");
  if (activeDate) activeDate.scrollIntoView({ block: "nearest", inline: "nearest" });

  $("#plan-input").placeholder = "할 일";
  $("#plan-input").disabled = selectedIsPast;
  $("#plan-submit-button").disabled = selectedIsPast;
  $("#new-list-button").disabled = selectedIsPast;
  $("#paste-list-button").disabled = selectedIsPast || !state.copiedList;
  const selectedHasArrived = state.selectedDate <= todayKey();
  const items = selectedHasArrived
    ? tasksForDate(state.selectedDate)
    : state.planned.filter((item) => item.date === state.selectedDate);
  const itemsNode = $("#planned-items");
  itemsNode.replaceChildren(...items.map((item, index) => {
    if (selectedHasArrived) {
      return renderTask(
        item,
        togglePlanToday,
        deletePlanToday,
        selectedIsToday ? createOrderControls(item.title, index, items.length, (distance) => movePlanTodayItem(item.id, distance)) : null,
        selectedIsPast
      );
    }
    const row = document.createElement("article");
    row.className = "task";
    row.innerHTML = `<span class="task-name">${item.title}</span>`;
    if (!selectedIsPast) {
      appendItemActions(row, createDeleteButton(() => {
        state.planned = state.planned.filter((task) => task.id !== item.id);
        persist();
        renderPlan();
      }), createOrderControls(
        item.title,
        index,
        items.length,
        (distance) => movePlannedItem(item.id, distance)
      ));
    }
    return row;
  }));
  if (!items.length) {
    itemsNode.innerHTML = selectedHasArrived
      ? '<p class="empty">이 날짜에 등록된 할 일이 없어요.</p>'
      : '<p class="empty">이 날짜에 예약된 일반 할 일이 없어요.</p>';
  }

  const lists = state.lists.filter((list) => list.date === state.selectedDate);
  $("#planned-lists").replaceChildren(...lists.map((list, index) => {
    const row = document.createElement("div");
    row.className = "planned-list";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = list.title;
    button.addEventListener("click", () => openList(list.id, "plan-view"));
    row.append(button);
    if (!selectedIsPast) {
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "copy-list";
      copyButton.textContent = "복사";
      copyButton.addEventListener("click", () => copyList(list.id));
      row.append(copyButton, createOrderControls(
        list.title,
        index,
        lists.length,
        (distance) => movePlannedList(list.id, distance)
      ));
    }
    return row;
  }));
};

const displayedMonths = () => {
  const baseMonths = availableMonths();
  const selectedMonth = state.selectedDate.slice(0, 7);
  if (baseMonths.includes(selectedMonth)) return baseMonths;
  return [0, 1, 2].map((offset) => shiftMonth(selectedMonth, offset));
};

const openList = (id, returnView) => {
  draftList = null;
  editingDraft = false;
  state.openedListId = id;
  state.listReturnView = returnView;
  persist();
  activateView("list-view");
};

const openNewList = () => {
  draftList = {
    id: newId(),
    title: "",
    date: state.selectedDate,
    items: []
  };
  editingDraft = true;
  state.listReturnView = "plan-view";
  activateView("list-view");
};

const activeList = () => {
  if (editingDraft) return draftList;
  return state.lists.find((item) => item.id === state.openedListId) || state.lists[0];
};

const syncOpenListTitle = () => {
  const list = activeList();
  const title = $("#list-title-input").value.trim();
  if (title) list.title = title;
  return list;
};

const renderList = () => {
  const list = activeList();
  if (!editingDraft) state.openedListId = list.id;
  const isTodayList = state.listReturnView === "today-view" && !editingDraft;
  const readOnly = !editingDraft && isPastDate(list.date);
  $("#list-view").classList.toggle("today-list-mode", isTodayList);
  $("#list-view").classList.toggle("readonly-list-mode", readOnly);
  $("#list-title").textContent = list.title || "새 리스트";
  $("#list-date").textContent = formatDate(list.date, { month: "long", day: "numeric", weekday: "short" });
  $("#list-title-input").value = list.title;
  $("#list-title-input").disabled = readOnly;
  $("#list-input").placeholder = "항목";
  $("#list-input").disabled = readOnly;
  $("#list-submit-button").disabled = readOnly;
  $("#list-items").replaceChildren(...list.items.map((item, index) => renderTask(item, (id) => {
    if (readOnly) return;
    const target = list.items.find((entry) => entry.id === id);
    target.completed = !target.completed;
    if (!editingDraft) persist();
    renderList();
  }, (id) => {
    if (readOnly) return;
    list.items = list.items.filter((entry) => entry.id !== id);
    if (!editingDraft) persist();
    renderList();
  }, readOnly ? null : createOrderControls(
    item.title,
    index,
    list.items.length,
    (distance) => moveListItem(item.id, distance)
  ), readOnly)));
};

const moveListItem = (itemId, distance) => {
  const list = activeList();
  if (!reorderVisibleItems(list.items, list.items.map((item) => item.id), itemId, distance)) return;
  if (!editingDraft) persist();
  renderList();
};

const processDueItems = () => {
  const today = toDateKey(dayOffset(0));
  const due = state.planned.filter((item) => item.date <= today);
  due.forEach((item) => {
    state.today.push({ id: newId(), date: item.date, title: item.title, completed: false });
  });
  state.planned = state.planned.filter((item) => item.date > today);
  if (state.lastDailyDate !== today) {
    state.daily.filter((item) => item.active).forEach((item) => {
      const alreadyCreated = state.today.some((task) => task.date === today && task.routineId === item.id);
      if (!alreadyCreated) {
        state.today.push({
          id: newId(),
          date: today,
          title: item.title,
          completed: false,
          routineId: item.id
        });
      }
    });
    state.lastDailyDate = today;
  }
  persist();
};

let touchStartX = null;
let touchStartedInPlanNavigation = false;
const isPlanNavigationTouch = (target) => Boolean(
  target?.closest("#date-picker") ||
  target?.closest(".date-navigation") ||
  target?.closest("#month-picker") ||
  target?.closest(".month-navigation") ||
  target?.closest(".calendar-jump")
);

$(".phone").addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
  touchStartedInPlanNavigation = $(".view.active")?.id === "plan-view" && isPlanNavigationTouch(event.target);
}, { passive: true });

$(".phone").addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const distance = event.changedTouches[0].clientX - touchStartX;
  const activeView = $(".view.active").id;
  if (distance > 55 && (activeView === "today-view" || activeView === "daily-view")) {
    openPlanForToday();
  }
  if (distance < -55 && activeView === "plan-view" && !touchStartedInPlanNavigation) {
    activateView("today-view");
  }
  touchStartX = null;
  touchStartedInPlanNavigation = false;
}, { passive: true });

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (!target) return;
  if (target.dataset.view === "plan-view") {
    openPlanForToday();
    return;
  }
  activateView(target.dataset.view);
});

$("#today-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#today-input");
  const title = input.value.trim();
  if (!title) return;
  state.today.unshift({ id: newId(), date: todayKey(), title, completed: false });
  input.value = "";
  persist();
  renderToday();
});

$("#daily-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#daily-input");
  const title = input.value.trim();
  if (!title) return;
  state.daily.unshift({ id: newId(), title, active: false });
  input.value = "";
  persist();
  renderDaily();
});

$("#plan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#plan-input");
  const title = input.value.trim();
  if (!title) return;
  if (state.selectedDate === todayKey()) {
    state.today.unshift({ id: newId(), date: state.selectedDate, title, completed: false });
  } else {
    state.planned.push({ id: newId(), date: state.selectedDate, title });
  }
  input.value = "";
  persist();
  renderPlan();
});

$("#previous-date").addEventListener("click", () => changeSelectedDate(-1));
$("#next-date").addEventListener("click", () => changeSelectedDate(1));
$("#today-jump-button").addEventListener("click", () => {
  state.selectedDate = todayKey();
  persist();
  renderPlan();
});
$("#calendar-input").addEventListener("change", (event) => {
  if (!event.target.value) return;
  state.selectedDate = event.target.value;
  persist();
  renderPlan();
});

const copyList = (listId) => {
  const list = state.lists.find((item) => item.id === listId);
  if (!list) return;
  state.copiedList = {
    title: list.title,
    items: list.items.map((item) => ({ title: item.title }))
  };
  persist();
  renderPlan();
};

const pasteCopiedList = () => {
  if (!state.copiedList || isPastDate(state.selectedDate)) return;
  state.lists.push({
    id: newId(),
    title: state.copiedList.title,
    date: state.selectedDate,
    items: state.copiedList.items.map((item) => ({
      id: newId(),
      title: item.title,
      completed: false
    }))
  });
  persist();
  renderPlan();
};

$("#new-list-button").addEventListener("click", () => {
  if (isPastDate(state.selectedDate)) return;
  openNewList();
  $("#list-title-input").focus();
});

$("#paste-list-button").addEventListener("click", pasteCopiedList);

$("#list-title-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const list = syncOpenListTitle();
  if (!list.title.trim()) return;
  if (editingDraft) {
    state.lists.push(list);
    state.openedListId = list.id;
    draftList = null;
    editingDraft = false;
  }
  persist();
  activateView(state.listReturnView || "plan-view");
});

$("#save-list-button").addEventListener("click", () => $("#list-title-form").requestSubmit());

$("#close-list-button").addEventListener("click", () => {
  draftList = null;
  editingDraft = false;
  activateView(state.listReturnView || "today-view");
});

$("#delete-list-button").addEventListener("click", () => {
  const list = activeList();
  if (!editingDraft) {
    state.lists = state.lists.filter((item) => item.id !== list.id);
    persist();
  }
  draftList = null;
  editingDraft = false;
  activateView(state.listReturnView || "plan-view");
});

$("#list-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#list-input");
  const list = syncOpenListTitle();
  const title = input.value.trim();
  if (!title) return;
  list.items.push({ id: newId(), title, completed: false });
  input.value = "";
  if (!editingDraft) persist();
  renderList();
});

$("#sample-button").addEventListener("click", () => {
  state = sampleState();
  persist();
  showStatus("샘플 데이터를 불러왔어요.");
  activateView("today-view");
});

$("#clear-button").addEventListener("click", () => {
  state = createEmptyState();
  persist();
  showStatus("데이터를 비웠어요.");
  activateView("today-view");
});

$("#export-button").addEventListener("click", () => {
  const payload = {
    app: "Swipe Todo",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `swipe-todo-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showStatus("백업 파일을 만들었어요.");
});

$("#import-input").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = normalizeState(parsed.state || parsed);
      persist();
      showStatus("백업을 복원했어요.");
      refreshActiveView();
    } catch {
      showStatus("복원 파일을 확인해 주세요.");
    }
    event.target.value = "";
  });
  reader.readAsText(file);
});

$("#login-form")?.addEventListener("submit", submitLogin);
$("#signup-form")?.addEventListener("submit", submitSignup);
$("#profile-form")?.addEventListener("submit", submitProfile);
$("#import-signup-data-button")?.addEventListener("click", () => finishSignupOnboarding(true));
$("#start-fresh-button")?.addEventListener("click", () => finishSignupOnboarding(false));
$("#email-check-button")?.addEventListener("click", checkSignupEmail);
$("#signup-email")?.addEventListener("input", () => {
  checkedSignupEmail = "";
});
$("#logout-button")?.addEventListener("click", signOut);

processDueItems();
renderToday();
renderDaily();
renderAccount();
initializeCloud();

if (
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof location !== "undefined" &&
  location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

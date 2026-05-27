const STORAGE_KEY = "swipe-todo-prototype-v1";

const $ = (selector) => document.querySelector(selector);

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

const seedState = () => ({
  today: [
    { id: newId(), title: "서류 제출하기", completed: false },
    { id: newId(), title: "영양제 먹기", completed: true }
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
  lastDailyDate: toDateKey(dayOffset(0))
});

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : seedState();
};

let state = loadState();
let draftList = null;
let editingDraft = false;

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const formatDate = (dateKey, options = {}) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", options).format(date);
};

const activateView = (viewId) => {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  if (viewId === "plan-view") renderPlan();
  if (viewId === "list-view") renderList();
};

const createDeleteButton = (onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete";
  button.textContent = "×";
  button.setAttribute("aria-label", "삭제");
  button.addEventListener("click", onClick);
  return button;
};

const renderTask = (task, onCheck, onDelete) => {
  const row = document.createElement("label");
  row.className = "task";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => onCheck(task.id));
  const name = document.createElement("span");
  name.className = "task-name";
  name.textContent = task.title;
  row.append(checkbox, name, createDeleteButton(() => onDelete(task.id)));
  return row;
};

const createMoveButton = (label, text, disabled, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "reorder";
  button.textContent = text;
  button.disabled = disabled;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
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
  const dateKey = toDateKey(dayOffset(0));
  $("#today-date").textContent = formatDate(dateKey, { month: "long", day: "numeric" });
  const incomplete = state.today.filter((task) => !task.completed);
  $("#today-count").textContent = `남은 일 ${incomplete.length}개`;
  const pendingNode = $("#today-items");
  const doneNode = $("#done-items");
  pendingNode.replaceChildren(...incomplete.map((task) => renderTask(task, toggleToday, deleteToday)));
  doneNode.replaceChildren(...state.today.filter((task) => task.completed).map((task) => renderTask(task, toggleToday, deleteToday)));
  if (!incomplete.length) pendingNode.innerHTML = '<p class="empty">오늘 할 일을 모두 끝냈어요.</p>';

  const cards = state.lists.filter((list) => list.date <= dateKey && list.items.some((item) => !item.completed));
  $("#arrived-lists").replaceChildren(...cards.map((list, index) => {
    const completeCount = list.items.filter((item) => item.completed).length;
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `<div><p class="card-label">예약 리스트</p><p>${list.title} ${completeCount} / ${list.items.length} 완료</p></div>`;
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "open-list";
    openButton.textContent = "열기";
    openButton.addEventListener("click", () => openList(list.id, "today-view"));
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(
      createMoveButton(`${list.title} 위로 이동`, "↑", index === 0, () => moveArrivedList(list.id, -1)),
      createMoveButton(`${list.title} 아래로 이동`, "↓", index === cards.length - 1, () => moveArrivedList(list.id, 1)),
      openButton
    );
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
      createMoveButton(`${routine.title} 위로 이동`, "↑", index === 0, () => moveDailyItem(routine.id, -1)),
      createMoveButton(`${routine.title} 아래로 이동`, "↓", index === state.daily.length - 1, () => moveDailyItem(routine.id, 1)),
      toggle,
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
  if (!availableMonths().includes(toMonthKey(selected))) return;
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

const moveArrivedList = (listId, distance) => {
  const today = toDateKey(dayOffset(0));
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
  const months = availableMonths();
  const monthLabels = ["이번 달", "다음 달", "다다음 달"];
  if (!months.includes(state.selectedDate.slice(0, 7))) {
    state.selectedDate = toDateKey(dayOffset(0));
  }
  $("#month-picker").replaceChildren(...months.map((monthKey, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-choice ${state.selectedDate.startsWith(monthKey) ? "active" : ""}`;
    button.innerHTML = `<strong>${formatDate(`${monthKey}-01`, { month: "long" })}</strong><small>${monthLabels[index]}</small>`;
    button.addEventListener("click", () => chooseMonth(monthKey));
    return button;
  }));

  const picker = $("#date-picker");
  picker.replaceChildren(...monthDates(state.selectedDate.slice(0, 7)).map((date) => {
    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-choice ${dateKey === state.selectedDate ? "active" : ""}`;
    button.innerHTML = `<strong>${date.getDate()}</strong><small>${formatDate(dateKey, { weekday: "short" })}</small>`;
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      persist();
      renderPlan();
    });
    return button;
  }));
  const activeDate = picker.querySelector(".active");
  if (activeDate) activeDate.scrollIntoView({ block: "nearest", inline: "center" });
  $("#previous-date").disabled = state.selectedDate === `${months[0]}-01`;
  $("#next-date").disabled = state.selectedDate === toDateKey(monthDates(months[2]).at(-1));

  $("#plan-input").placeholder = `${formatDate(state.selectedDate, { month: "long", day: "numeric" })} 할 일 입력`;
  const items = state.planned.filter((item) => item.date === state.selectedDate);
  const itemsNode = $("#planned-items");
  itemsNode.replaceChildren(...items.map((item) => {
    const row = document.createElement("article");
    row.className = "task";
    row.innerHTML = `<span class="task-name">${item.title}</span>`;
    row.append(createDeleteButton(() => {
      state.planned = state.planned.filter((task) => task.id !== item.id);
      persist();
      renderPlan();
    }));
    return row;
  }));
  if (!items.length) itemsNode.innerHTML = '<p class="empty">이 날짜에 예약된 일반 할 일이 없어요.</p>';

  const lists = state.lists.filter((list) => list.date === state.selectedDate);
  $("#planned-lists").replaceChildren(...lists.map((list, index) => {
    const row = document.createElement("div");
    row.className = "planned-list";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = list.title;
    button.addEventListener("click", () => openList(list.id, "plan-view"));
    const up = document.createElement("button");
    up.type = "button";
    up.className = "reorder";
    up.textContent = "↑";
    up.disabled = index === 0;
    up.setAttribute("aria-label", `${list.title} 위로 이동`);
    up.addEventListener("click", () => movePlannedList(list.id, -1));
    const down = document.createElement("button");
    down.type = "button";
    down.className = "reorder";
    down.textContent = "↓";
    down.disabled = index === lists.length - 1;
    down.setAttribute("aria-label", `${list.title} 아래로 이동`);
    down.addEventListener("click", () => movePlannedList(list.id, 1));
    row.append(button, up, down);
    return row;
  }));
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

const renderList = () => {
  const list = activeList();
  if (!editingDraft) state.openedListId = list.id;
  $("#list-title").textContent = list.title || "새 리스트";
  $("#list-date").textContent = formatDate(list.date, { month: "long", day: "numeric", weekday: "short" });
  $("#list-title-input").value = list.title;
  $("#list-input").placeholder = `${list.title || "리스트"} 항목 입력`;
  const backButton = $("#list-back-button");
  if (state.listReturnView === "plan-view") {
    backButton.textContent = `${formatDate(list.date, { month: "numeric", day: "numeric" })} 계획으로`;
  } else {
    backButton.textContent = "오늘로";
  }
  $("#list-items").replaceChildren(...list.items.map((item) => renderTask(item, (id) => {
    const target = list.items.find((entry) => entry.id === id);
    target.completed = !target.completed;
    if (!editingDraft) persist();
    renderList();
  }, (id) => {
    list.items = list.items.filter((entry) => entry.id !== id);
    if (!editingDraft) persist();
    renderList();
  })));
};

const processDueItems = () => {
  const today = toDateKey(dayOffset(0));
  const due = state.planned.filter((item) => item.date <= today);
  due.forEach((item) => {
    state.today.push({ id: newId(), title: item.title, completed: false });
  });
  state.planned = state.planned.filter((item) => item.date > today);
  if (state.lastDailyDate !== today) {
    state.daily.filter((item) => item.active).forEach((item) => {
      state.today.push({ id: newId(), title: item.title, completed: false });
    });
    state.lastDailyDate = today;
  }
  persist();
};

let touchStartX = null;
$(".phone").addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

$(".phone").addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const distance = event.changedTouches[0].clientX - touchStartX;
  const activeView = $(".view.active").id;
  if (distance < -55 && (activeView === "today-view" || activeView === "daily-view")) {
    activateView("plan-view");
  }
  if (distance > 55 && activeView === "plan-view") {
    activateView("today-view");
  }
  touchStartX = null;
}, { passive: true });

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (target) activateView(target.dataset.view);
});

$("#today-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#today-input");
  state.today.unshift({ id: newId(), title: input.value.trim(), completed: false });
  input.value = "";
  persist();
  renderToday();
});

$("#daily-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#daily-input");
  state.daily.unshift({ id: newId(), title: input.value.trim(), active: true });
  input.value = "";
  persist();
  renderDaily();
});

$("#plan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#plan-input");
  state.planned.push({ id: newId(), date: state.selectedDate, title: input.value.trim() });
  input.value = "";
  persist();
  renderPlan();
});

$("#previous-date").addEventListener("click", () => changeSelectedDate(-1));
$("#next-date").addEventListener("click", () => changeSelectedDate(1));

$("#new-list-button").addEventListener("click", () => {
  openNewList();
  $("#list-title-input").focus();
});

$("#list-title-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const list = activeList();
  list.title = $("#list-title-input").value.trim();
  if (editingDraft) {
    state.lists.push(list);
    state.openedListId = list.id;
    draftList = null;
    editingDraft = false;
  }
  persist();
  activateView(state.listReturnView || "plan-view");
});

$("#list-back-button").addEventListener("click", () => {
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
  const list = activeList();
  list.items.push({ id: newId(), title: input.value.trim(), completed: false });
  input.value = "";
  if (!editingDraft) persist();
  renderList();
});

$("#reset-button").addEventListener("click", () => {
  state = seedState();
  persist();
  renderToday();
  renderDaily();
  activateView("today-view");
});

processDueItems();
renderToday();
renderDaily();

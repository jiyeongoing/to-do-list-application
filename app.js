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

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const loaded = stored ? JSON.parse(stored) : seedState();
  if (!Object.prototype.hasOwnProperty.call(loaded, "copiedList")) loaded.copiedList = null;
  if (!loaded.samplePastListAdded) {
    const hasPastList = loaded.lists?.some((list) => list.date < toDateKey(dayOffset(0)));
    if (!hasPastList) {
      loaded.lists.push({
        id: newId(),
        title: "지난 장보기",
        date: toDateKey(dayOffset(-2)),
        items: [
          { id: newId(), title: "두부", completed: true },
          { id: newId(), title: "김치", completed: true }
        ]
      });
    }
    loaded.samplePastListAdded = true;
  }
  return loaded;
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
  if (viewId === "today-view") renderToday();
  if (viewId === "daily-view") renderDaily();
  if (viewId === "plan-view") renderPlan();
  if (viewId === "list-view") renderList();
};

const todayKey = () => toDateKey(dayOffset(0));

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
  const incomplete = state.today.filter((task) => !task.completed);
  $("#today-count").textContent = `남은 일 ${incomplete.length}개`;
  const pendingNode = $("#today-items");
  const doneNode = $("#done-items");
  pendingNode.replaceChildren(...incomplete.map((task, index) => renderTask(
    task,
    toggleToday,
    deleteToday,
    createOrderControls(task.title, index, incomplete.length, (distance) => moveTodayItem(task.id, distance))
  )));
  doneNode.replaceChildren(...state.today.filter((task) => task.completed).map((task) => renderTask(task, toggleToday, deleteToday)));
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
  const ids = state.today.filter((item) => !item.completed).map((item) => item.id);
  if (!reorderVisibleItems(state.today, ids, itemId, distance)) return;
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
  if (activeDate) activeDate.scrollIntoView({ block: "nearest", inline: "center" });

  $("#plan-input").placeholder = "할 일";
  $("#plan-input").disabled = selectedIsPast;
  $("#plan-submit-button").disabled = selectedIsPast;
  $("#new-list-button").disabled = selectedIsPast;
  $("#paste-list-button").disabled = selectedIsPast || !state.copiedList;
  const items = state.planned.filter((item) => item.date === state.selectedDate);
  const itemsNode = $("#planned-items");
  itemsNode.replaceChildren(...items.map((item, index) => {
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
  const title = input.value.trim();
  if (!title) return;
  state.today.unshift({ id: newId(), title, completed: false });
  input.value = "";
  persist();
  renderToday();
});

$("#daily-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#daily-input");
  const title = input.value.trim();
  if (!title) return;
  state.daily.unshift({ id: newId(), title, active: true });
  input.value = "";
  persist();
  renderDaily();
});

$("#plan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#plan-input");
  const title = input.value.trim();
  if (!title) return;
  state.planned.push({ id: newId(), date: state.selectedDate, title });
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

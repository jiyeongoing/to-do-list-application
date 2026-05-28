const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeClassList {
  constructor(element) {
    this.element = element;
  }

  _set() {
    return new Set(this.element.className.split(/\s+/).filter(Boolean));
  }

  contains(name) {
    return this._set().has(name);
  }

  toggle(name, force) {
    const names = this._set();
    const shouldAdd = force === undefined ? !names.has(name) : force;
    if (shouldAdd) names.add(name);
    else names.delete(name);
    this.element.className = [...names].join(" ");
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.className = "";
    this.id = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.placeholder = "";
    this.textContent = "";
    this.classList = new FakeClassList(this);
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || "";
  }

  append(...nodes) {
    nodes.filter(Boolean).forEach((node) => {
      if (typeof node !== "string") node.parentElement = this;
      this.children.push(node);
    });
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    event.preventDefault = event.preventDefault || (() => {});
    event.stopPropagation = event.stopPropagation || (() => {});
    (this.listeners[event.type] || []).forEach((handler) => handler(event));
  }

  requestSubmit() {
    this.dispatchEvent({ type: "submit" });
  }

  setAttribute(name, value) {
    this[name] = value;
    if (name.startsWith("data-")) {
      this.dataset[name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matches(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  focus() {}

  scrollIntoView() {}

  querySelector(selector) {
    if (selector.includes(" ")) {
      const [parentSelector, childSelector] = selector.split(/\s+/, 2);
      return this.querySelector(parentSelector)?.querySelector(childSelector) || null;
    }
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = (node) => {
      if (!(node instanceof FakeElement)) return;
      if (matches(node, selector)) result.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return result;
  }
}

const matches = (element, selector) => {
  if (selector.startsWith("#")) return element.id === selector.slice(1);
  if (selector === ".view.active") {
    return element.classList.contains("view") && element.classList.contains("active");
  }
  if (selector.startsWith(".")) return element.classList.contains(selector.slice(1));
  if (selector === "[data-view]") return Boolean(element.dataset.view);
  return element.tagName.toLowerCase() === selector.toLowerCase();
};

class FakeDocument extends FakeElement {
  constructor() {
    super("document");
    this.byId = {};
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  register(id, className = "") {
    const element = this.createElement("div");
    element.id = id;
    element.className = className;
    element.classList = new FakeClassList(element);
    this.byId[id] = element;
    this.append(element);
  }

  querySelector(selector) {
    if (selector.includes(" ")) {
      const [parentSelector, childSelector] = selector.split(/\s+/, 2);
      return this.querySelector(parentSelector)?.querySelector(childSelector) || null;
    }
    if (selector.startsWith("#")) return this.byId[selector.slice(1)] || null;
    return super.querySelector(selector);
  }

  querySelectorAll(selector) {
    if (selector === ".view") {
      return Object.values(this.byId).filter((element) => element.classList.contains("view"));
    }
    return super.querySelectorAll(selector);
  }
}

const createDocument = () => {
  const document = new FakeDocument();
  [
    ["today-view", "view active"],
    ["daily-view", "view"],
    ["plan-view", "view"],
    ["list-view", "view"],
    ["today-date"],
    ["today-count"],
    ["today-items"],
    ["arrived-lists"],
    ["done-items"],
    ["daily-items"],
    ["month-picker"],
    ["calendar-input"],
    ["date-picker"],
    ["previous-date"],
    ["next-date"],
    ["today-jump-button"],
    ["plan-input"],
    ["planned-items"],
    ["planned-lists"],
    ["list-title"],
    ["list-date"],
    ["list-title-input"],
    ["list-input"],
    ["list-items"],
    ["today-input"],
    ["today-form"],
    ["daily-input"],
    ["daily-form"],
    ["plan-form"],
    ["plan-submit-button"],
    ["new-list-button"],
    ["paste-list-button"],
    ["list-title-form"],
    ["close-list-button"],
    ["save-list-button"],
    ["delete-list-button"],
    ["list-form"],
    ["list-submit-button"],
    ["reset-button"]
  ].forEach(([id, className]) => document.register(id, className));
  document.register("phone", "phone");
  return document;
};

const appCode = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

const runAppTest = (body) => {
  const document = createDocument();
  const context = {
    assert,
    document,
    Intl,
    console,
    Date,
    crypto: { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` },
    localStorage: {
      store: {},
      getItem(key) {
        return this.store[key] || null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      }
    }
  };

  vm.runInNewContext(`${appCode}\n${body}`, context, { filename: "todo.test.vm.js" });
};

test("오늘 할 일은 미완료 항목 안에서 순서를 변경한다", () => {
  runAppTest(`
    state.today = [
      { id: "today-a", title: "오늘 A", completed: false },
      { id: "today-b", title: "오늘 B", completed: false },
      { id: "today-c", title: "완료 C", completed: true }
    ];
    renderToday();
    moveTodayItem("today-b", -1);
    assert.equal(state.today[0].id, "today-b");
    assert.equal(state.today[2].id, "today-c");
  `);
});

test("데일리 루틴과 계획 항목은 순서를 변경할 수 있다", () => {
  runAppTest(`
    state.daily = [
      { id: "daily-a", title: "데일리 A", active: true },
      { id: "daily-b", title: "데일리 B", active: false }
    ];
    moveDailyItem("daily-b", -1);
    assert.equal(state.daily[0].id, "daily-b");

    state.selectedDate = "2026-06-01";
    state.planned = [
      { id: "plan-a", date: "2026-06-01", title: "계획 A" },
      { id: "plan-b", date: "2026-06-01", title: "계획 B" }
    ];
    movePlannedItem("plan-b", -1);
    assert.equal(state.planned[0].id, "plan-b");
  `);
});

test("새 리스트는 항목 추가 후에도 입력한 리스트명을 유지한다", () => {
  runAppTest(`
    draftList = {
      id: "draft",
      title: "",
      date: "2026-06-01",
      items: []
    };
    editingDraft = true;
    renderList();

    document.querySelector("#list-title-input").value = "마트";
    document.querySelector("#list-input").value = "우유";
    document.querySelector("#list-form").requestSubmit();

    assert.equal(draftList.title, "마트");
    assert.equal(draftList.items[0].title, "우유");
    assert.equal(document.querySelector("#list-title-input").value, "마트");
  `);
});

test("오늘 리스트 완료 수는 항목 추가 후 다시 계산된다", () => {
  runAppTest(`
    const today = todayKey();
    state.lists = [{
      id: "list-a",
      title: "장보기",
      date: today,
      items: [
        { id: "item-a", title: "우유", completed: false },
        { id: "item-b", title: "사과", completed: true }
      ]
    }];
    openList("list-a", "today-view");

    document.querySelector("#list-input").value = "계란";
    document.querySelector("#list-form").requestSubmit();
    activateView("today-view");

    assert.match(document.querySelector("#arrived-lists").children[0].innerHTML, /1 \\/ 3 완료/);
  `);
});

test("계획에서 오늘 날짜를 선택하면 오늘 할 일을 보여준다", () => {
  runAppTest(`
    state.selectedDate = todayKey();
    state.today = [
      { id: "today-a", title: "오늘 A", completed: false },
      { id: "today-b", title: "완료 B", completed: true }
    ];
    state.planned = [];

    renderPlan();

    const rows = document.querySelector("#planned-items").children;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children[1].textContent, "오늘 A");
  `);
});

test("계획에서 오늘 날짜에 추가한 할 일은 오늘 목록에 저장된다", () => {
  runAppTest(`
    state.selectedDate = todayKey();
    state.today = [];
    state.planned = [];

    document.querySelector("#plan-input").value = "오늘 회의";
    document.querySelector("#plan-form").requestSubmit();

    assert.equal(state.today[0].title, "오늘 회의");
    assert.equal(state.planned.length, 0);
  `);
});

test("날짜 이동은 캘린더와 오늘 버튼을 모두 지원한다", () => {
  runAppTest(`
    document.querySelector("#calendar-input").value = "2026-07-15";
    document.querySelector("#calendar-input").dispatchEvent({ type: "change" });
    assert.equal(state.selectedDate, "2026-07-15");

    document.querySelector("#today-jump-button").dispatchEvent({ type: "click" });
    assert.equal(state.selectedDate, todayKey());
  `);
});

test("계획하기 버튼으로 들어가면 날짜가 오늘로 초기화된다", () => {
  runAppTest(`
    const planButton = document.createElement("button");
    planButton.setAttribute("data-view", "plan-view");
    document.append(planButton);

    state.selectedDate = "2026-07-15";
    document.dispatchEvent({ type: "click", target: planButton });

    assert.equal(state.selectedDate, todayKey());
    assert.equal(document.querySelector("#plan-view").classList.contains("active"), true);
  `);
});

test("과거 날짜는 입력과 편집을 막고 읽기전용으로 보여준다", () => {
  runAppTest(`
    const past = toDateKey(dayOffset(-1));
    state.selectedDate = past;
    state.lists = [{
      id: "past-list",
      title: "지난 장보기",
      date: past,
      items: [{ id: "past-item", title: "두부", completed: true }]
    }];

    renderPlan();
    assert.equal(document.querySelector("#plan-input").disabled, true);
    assert.equal(document.querySelector("#new-list-button").disabled, true);

    openList("past-list", "plan-view");
    assert.equal(document.querySelector("#list-input").disabled, true);
    assert.equal(document.querySelector("#list-submit-button").disabled, true);
  `);
});

test("리스트 복사 후 선택 날짜에 붙여넣으면 완료 상태는 초기화된다", () => {
  runAppTest(`
    state.selectedDate = "2026-06-01";
    state.lists = [{
      id: "copy-source",
      title: "여행 준비",
      date: "2026-06-01",
      items: [
        { id: "copy-item-a", title: "여권", completed: true },
        { id: "copy-item-b", title: "충전기", completed: false }
      ]
    }];
    copyList("copy-source");

    state.selectedDate = "2026-06-05";
    pasteCopiedList();
    const pasted = state.lists.find((list) => list.date === "2026-06-05");

    assert.equal(pasted.title, "여행 준비");
    assert.deepEqual(pasted.items.map((item) => item.completed), [false, false]);
  `);
});

test("순서 버튼은 맨 위에 아래, 맨 아래에 위 방향만 표시한다", () => {
  runAppTest(`
    const topControls = createOrderControls("맨위", 0, 3, () => {});
    assert.equal(topControls.children.length, 1);
    assert.equal(topControls.children[0].textContent, "▼");

    const bottomControls = createOrderControls("맨밑", 2, 3, () => {});
    assert.equal(bottomControls.children.length, 1);
    assert.equal(bottomControls.children[0].textContent, "▲");
  `);
});

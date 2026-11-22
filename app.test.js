import test from "node:test";
import assert from "node:assert/strict";

test("board keyboard navigation keeps one tab stop across selection and restart", async () => {
  class Element {
    children = [];
    listeners = {};
    attributes = {};
    classList = { add() {} };
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    focus() {
      document.activeElement = this;
      this.listeners.focus?.();
    }
    click() { this.listeners.click?.(); }
  }
  const elements = Object.fromEntries(["board", "status", "hint", "restart", "preview-actions", "confirm-move", "cancel-preview"].map(id => [id, new Element()]));
  globalThis.document = {
    querySelector: selector => elements[selector.slice(1)],
    createElement: () => new Element()
  };
  try {
    await import("./app.js");
    const board = elements.board;
    const key = name => {
      let prevented = false;
      board.listeners.keydown({ key: name, target: document.activeElement, preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    };
    const focused = () => board.children.indexOf(document.activeElement);
    const checkTabStop = square => {
      assert.deepEqual(board.children.flatMap((button, index) => button.tabIndex === 0 ? [index] : []), [square]);
    };
    board.children[0].focus();
    key("ArrowLeft");
    assert.equal(focused(), 0);
    key("ArrowRight");
    key("ArrowRight");
    assert.equal(focused(), 2);
    board.children[2].click();
    assert.equal(focused(), 2);
    assert.match(document.activeElement.attributes["aria-label"], /selected/);
    key("ArrowDown");
    assert.equal(focused(), 10);
    checkTabStop(10);
    elements.restart.click();
    checkTabStop(0);
  } finally {
    delete globalThis.document;
  }
});

test("opponent escape is previewed before confirmation and remains the opponent's choice", async () => {
  class Element {
    children = [];
    listeners = {};
    attributes = {};
    classList = { add() {} };
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    focus() { document.activeElement = this; this.listeners.focus?.(); }
    click() { this.listeners.click?.(); }
  }
  const elements = Object.fromEntries(["board", "status", "hint", "restart", "preview-actions", "confirm-move", "cancel-preview"].map(id => [id, new Element()]));
  globalThis.document = {
    querySelector: selector => elements[selector.slice(1)],
    createElement: () => new Element()
  };
  try {
    await import("./app.js?preview-test");
    const board = elements.board;
    board.children[2].click();
    board.children[16].click();
    assert.equal(elements["preview-actions"].hidden, false);
    assert.match(elements.hint.textContent, /Black can escape to e7/);
    assert.match(board.children[16].attributes["aria-label"], /Black ship, previewed opponent/);
    assert.match(board.children[52].attributes["aria-label"], /escape option after move/);
    assert.match(board.children[2].attributes["aria-label"], /White ship/);
    board.children[52].click();
    assert.match(elements.status.textContent, /White to move/);
    elements["cancel-preview"].click();
    assert.equal(elements["preview-actions"].hidden, true);
    assert.match(board.children[16].attributes["aria-label"], /Black ship/);
    board.children[16].click();
    elements["confirm-move"].click();
    assert.match(elements.status.textContent, /Black: choose an escape/);
    assert.match(board.children[52].attributes["aria-label"], /available destination/);
    board.children[52].click();
    assert.match(board.children[52].attributes["aria-label"], /Black ship/);
    assert.match(elements.status.textContent, /Black to move/);
    assert.equal(elements["preview-actions"].hidden, true);

    elements.restart.click();
    const selectMove = (from, to) => {
      board.children[from].click();
      board.children[to].click();
    };
    selectMove(5, 1);
    selectMove(40, 58);
    elements["confirm-move"].click();
    board.children[30].click();
    selectMove(4, 18);
    selectMove(32, 18);
    assert.match(elements.hint.textContent, /White can escape to g7, h8/);
    assert.deepEqual(board.children.flatMap((button, square) =>
      button.attributes["aria-label"].includes("escape option after move") ? [square] : []), [54, 63]);
    for (const square of [54, 63]) {
      assert.match(board.children[square].attributes["aria-label"], /escape option after move/);
      assert.equal(board.children[square].children.some(child => child.className === "escape-marker"), true);
    }
    elements["confirm-move"].click();
    for (const square of [54, 63])
      assert.match(board.children[square].attributes["aria-label"], /available destination/);
    board.children[63].click();
    assert.match(board.children[63].attributes["aria-label"], /White ship/);
  } finally {
    delete globalThis.document;
  }
});

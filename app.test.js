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
  const elements = Object.fromEntries(["board", "status", "hint", "restart"].map(id => [id, new Element()]));
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

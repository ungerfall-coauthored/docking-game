import test from "node:test";
import assert from "node:assert/strict";
import { BLACK, WHITE, connected, displace, legalMoves, move, newGame } from "./engine.js";

const at = (x, y) => y * 8 + x;
function position(white, black, turn = WHITE) {
  const board = Array(64).fill(null);
  for (const [x, y] of white) board[at(x, y)] = WHITE;
  for (const [x, y] of black) board[at(x, y)] = BLACK;
  return { board, turn, pending: null, winner: null, reason: null, history: {} };
}

test("initial position contains eight ships per fleet and white moves first", () => {
  const game = newGame();
  assert.equal(game.board.filter(p => p === WHITE).length, 8);
  assert.equal(game.board.filter(p => p === BLACK).length, 8);
  assert.equal(game.turn, WHITE);
  assert.ok(legalMoves(game, at(2, 0)).length > 0);
  assert.deepEqual(legalMoves(game, at(0, 2)), []);
});

test("movement counts only the chosen ray, jumps allies, and cannot jump enemies", () => {
  const allies = position([[1, 3], [2, 3], [0, 3]], [[7, 7], [5, 6]]);
  assert.ok(legalMoves(allies, at(1, 3)).includes(at(3, 3)));
  const enemies = position([[1, 3], [0, 3]], [[2, 3], [4, 3], [7, 7]]);
  assert.ok(!legalMoves(enemies, at(1, 3)).includes(at(4, 3)));
});

test("landing on an enemy requires a clear escape, chosen by the displaced captain", () => {
  const game = position([[3, 4], [1, 2], [2, 3], [3, 7]], [[6, 4], [7, 4]]);
  const from = at(3, 4), to = at(6, 4), escape = at(2, 0);
  assert.ok(legalMoves(game, from).includes(to));
  const pending = move(game, from, to);
  assert.equal(game.board[from], WHITE);
  assert.equal(pending.pending.player, BLACK);
  assert.ok(pending.pending.choices.includes(escape));
  assert.throws(() => displace(pending, at(5, 3)), /Illegal/);
  const result = displace(pending, escape);
  assert.equal(result.board[escape], BLACK);
  assert.equal(result.board[to], WHITE);
  assert.equal(result.turn, BLACK);
  assert.equal(result.pending, null);
});

test("escape can extend beyond four squares, but cannot cross a ship", () => {
  const example = position([[0, 0], [0, 7]], [[2, 0], [7, 7]]);
  const displaced = move(example, at(0, 0), at(2, 0));
  assert.ok(displaced.pending.choices.includes(at(7, 5)));
  const blocked = position([[0, 0], [4, 2], [0, 7]], [[2, 0], [7, 7]]);
  assert.ok(!legalMoves(blocked, at(0, 0)).includes(at(2, 0)));
});

test("orthogonal connections win, while diagonal touching does not connect", () => {
  const diagonal = position([[1, 1], [2, 2]], [[6, 6], [7, 7]]);
  assert.equal(connected(diagonal.board, WHITE), false);
  const game = position([[1, 1], [2, 2]], [[6, 6], [7, 7]]);
  const result = move(game, at(2, 2), at(2, 1));
  assert.equal(result.winner, WHITE);
  assert.equal(result.reason, "docked");
  assert.throws(() => move(result, at(6, 6), at(5, 5)), /Illegal/);
});

test("a ship enclosed on four sides by enemies crashes", () => {
  const game = position([[3, 2], [2, 3], [4, 3], [3, 7]], [[3, 3], [7, 7]]);
  const result = move(game, at(3, 7), at(3, 4));
  assert.equal(result.winner, WHITE);
  assert.equal(result.reason, "trapped");
});

test("board edges alone do not count as surrounding ships", () => {
  const game = position([[1, 0], [1, 1], [7, 7]], [[0, 0], [6, 6]]);
  const result = move(game, at(1, 1), at(0, 1));
  assert.notEqual(result.reason, "trapped");
});

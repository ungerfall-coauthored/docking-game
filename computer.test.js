import test from "node:test";
import assert from "node:assert/strict";
import { chooseComputerAction } from "./computer.js";
import { BLACK, WHITE, displace, legalMoves, move, newGame } from "./engine.js";

test("computer chooses a legal move without mutating the game", () => {
  const original = newGame();
  const game = { ...original, turn: BLACK };
  const snapshot = structuredClone(game);
  const action = chooseComputerAction(game);
  assert.ok(legalMoves(game, action.from).includes(action.to));
  assert.deepEqual(game, snapshot);
  assert.equal(chooseComputerAction(original), null);
});

test("computer takes an immediate docking win", () => {
  const board = Array(64).fill(null);
  for (const square of [9, 18]) board[square] = BLACK;
  for (const square of [54, 63]) board[square] = WHITE;
  const game = { board, turn: BLACK, pending: null, winner: null, reason: null, history: {} };
  const action = chooseComputerAction(game);
  const result = move(game, action.from, action.to);
  assert.equal(result.winner, BLACK);
});

test("computer handles its own displacement but not the human's", () => {
  const displaced = move(newGame(), 2, 16);
  const choice = chooseComputerAction(displaced);
  assert.ok(displaced.pending.choices.includes(choice.escape));
  assert.equal(displace(displaced, choice.escape).turn, BLACK);
  assert.equal(chooseComputerAction({ ...displaced, pending: { ...displaced.pending, player: WHITE } }), null);
});

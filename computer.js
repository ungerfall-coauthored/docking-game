import { BLACK, WHITE, displace, legalMoves, move } from "./engine.js";

function fleetScore(board, player) {
  const pieces = board.flatMap((piece, square) => piece === player ? [square] : []);
  const remaining = new Set(pieces);
  let groups = 0;
  while (remaining.size) {
    groups++;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    for (const square of queue) {
      const x = square % 8, y = Math.floor(square / 8);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= 8 || ny < 0 || ny >= 8) continue;
        const next = ny * 8 + nx;
        if (remaining.delete(next)) queue.push(next);
      }
    }
  }
  let distance = 0;
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      distance += Math.abs(pieces[i] % 8 - pieces[j] % 8)
        + Math.abs(Math.floor(pieces[i] / 8) - Math.floor(pieces[j] / 8));
    }
  }
  return -groups * 150 - distance;
}

function evaluate(game) {
  if (game.winner) return game.winner === BLACK ? 100000 : -100000;
  if (game.reason) return 0;
  return fleetScore(game.board, BLACK) - fleetScore(game.board, WHITE);
}

function resolvedScores(game) {
  if (!game.pending) return evaluate(game);
  const scores = game.pending.choices.map(to => evaluate(displace(game, to)));
  return game.pending.player === BLACK ? Math.max(...scores) : Math.min(...scores);
}

function possibleMoves(game) {
  const result = [];
  for (let from = 0; from < game.board.length; from++) {
    for (const to of legalMoves(game, from)) {
      const next = move(game, from, to);
      result.push({ action: { from, to }, next, score: resolvedScores(next) });
    }
  }
  return result;
}

function worstHumanReply(game) {
  if (game.reason || game.winner) return evaluate(game);
  if (game.pending) {
    const replies = game.pending.choices.map(to => worstHumanReply(displace(game, to)));
    return game.pending.player === BLACK ? Math.max(...replies) : Math.min(...replies);
  }
  if (game.turn !== WHITE) return evaluate(game);
  const replies = possibleMoves(game);
  return replies.length ? Math.min(...replies.map(reply => reply.score)) : evaluate(game);
}

export function chooseComputerAction(game) {
  if (game.reason || game.winner) return null;
  if (game.pending) {
    if (game.pending.player !== BLACK) return null;
    const choices = game.pending.choices.map(to => ({ to, score: evaluate(displace(game, to)) }));
    choices.sort((a, b) => b.score - a.score);
    return { escape: choices[0].to };
  }
  if (game.turn !== BLACK) return null;
  const options = possibleMoves(game).sort((a, b) => b.score - a.score);
  if (!options.length) return null;
  const considered = options.slice(0, 8);
  for (const option of considered) option.replyScore = worstHumanReply(option.next);
  considered.sort((a, b) => b.replyScore - a.replyScore || b.score - a.score);
  return considered[0].action;
}

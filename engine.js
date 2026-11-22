export const SIZE = 8;
export const WHITE = "white";
export const BLACK = "black";
const directions = [
  [-1, -1], [0, -1], [1, -1], [-1, 0],
  [1, 0], [-1, 1], [0, 1], [1, 1]
];
const diagonal = directions.filter(([dx, dy]) => dx && dy);
const orthogonal = directions.filter(([dx, dy]) => !dx || !dy);
const other = player => player === WHITE ? BLACK : WHITE;
const inside = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
const index = (x, y) => y * SIZE + x;
const coordinates = square => [square % SIZE, Math.floor(square / SIZE)];
const positionKey = (board, turn) => `${board.map(p => p === WHITE ? "w" : p === BLACK ? "b" : ".").join("")}:${turn}`;

export function newGame() {
  const board = Array(SIZE * SIZE).fill(null);
  for (let n = 2; n <= 5; n++) {
    board[index(n, 0)] = board[index(n, 7)] = WHITE;
    board[index(0, n)] = board[index(7, n)] = BLACK;
  }
  return { board, turn: WHITE, pending: null, winner: null, reason: null,
    history: { [positionKey(board, WHITE)]: 1 } };
}

function escapeSquares(board, square) {
  const [x, y] = coordinates(square);
  const result = [];
  for (const [dx, dy] of diagonal) {
    for (let n = 1; inside(x + dx * n, y + dy * n); n++) {
      const target = index(x + dx * n, y + dy * n);
      if (board[target]) break;
      if (n >= 4) result.push(target);
    }
  }
  return result;
}

export function legalMoves(game, from) {
  if (game.winner || game.reason || game.pending || !Number.isInteger(from) ||
      from < 0 || from >= 64 || game.board[from] !== game.turn) return [];
  const [x, y] = coordinates(from);
  const board = game.board;
  const moves = [];
  for (const [dx, dy] of directions) {
    let distance = 1;
    for (let n = 1; inside(x + dx * n, y + dy * n); n++) {
      if (board[index(x + dx * n, y + dy * n)]) distance++;
    }
    const tx = x + dx * distance, ty = y + dy * distance;
    if (!inside(tx, ty)) continue;
    let blocked = false;
    for (let n = 1; n < distance; n++) {
      if (board[index(x + dx * n, y + dy * n)] === other(game.turn)) blocked = true;
    }
    const to = index(tx, ty);
    if (blocked || board[to] === game.turn) continue;
    if (board[to]) {
      const after = board.slice();
      after[from] = null;
      after[to] = game.turn;
      if (!escapeSquares(after, to).length) continue;
    }
    moves.push(to);
  }
  return moves;
}

export function connected(board, player) {
  const pieces = board.flatMap((p, i) => p === player ? [i] : []);
  if (!pieces.length) return false;
  const visited = new Set([pieces[0]]);
  const queue = [pieces[0]];
  for (const square of queue) {
    const [x, y] = coordinates(square);
    for (const [dx, dy] of orthogonal) {
      if (!inside(x + dx, y + dy)) continue;
      const next = index(x + dx, y + dy);
      if (board[next] === player && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited.size === pieces.length;
}

function trapped(board, player) {
  return board.some((piece, square) => {
    if (piece !== player) return false;
    const [x, y] = coordinates(square);
    return orthogonal.every(([dx, dy]) =>
      inside(x + dx, y + dy) && board[index(x + dx, y + dy)] === other(player));
  });
}

function finish(game, board) {
  const actor = game.turn;
  const opponent = other(actor);
  let winner = null, reason = null;
  if (trapped(board, opponent)) { winner = actor; reason = "trapped"; }
  else if (trapped(board, actor)) { winner = opponent; reason = "trapped"; }
  else if (connected(board, actor)) { winner = actor; reason = "docked"; }
  else if (connected(board, opponent)) { winner = opponent; reason = "docked"; }
  const turn = opponent;
  const key = positionKey(board, turn);
  const history = { ...game.history, [key]: (game.history[key] || 0) + 1 };
  let result = { board, turn, pending: null, winner, reason, history };
  if (!reason && history[key] >= 3) result = { ...result, reason: "repetition" };
  if (!result.reason && !board.some((piece, square) => piece === turn && legalMoves(result, square).length))
    result = { ...result, reason: "stalemate" };
  return result;
}

export function move(game, from, to) {
  if (!legalMoves(game, from).includes(to)) throw new Error("Illegal move");
  const board = game.board.slice();
  const displaced = board[to];
  board[from] = null;
  board[to] = game.turn;
  if (displaced) {
    return { ...game, board, pending: { player: displaced, from: to, choices: escapeSquares(board, to) } };
  }
  return finish(game, board);
}

export function displace(game, to) {
  if (!game.pending || !game.pending.choices.includes(to)) throw new Error("Illegal displacement");
  const board = game.board.slice();
  board[to] = game.pending.player;
  return finish(game, board);
}

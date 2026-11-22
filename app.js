import { BLACK, WHITE, displace, legalMoves, move, newGame } from "./engine.js";

const boardElement = document.querySelector("#board");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const opportunities = document.querySelector("#opportunities");
const restart = document.querySelector("#restart");
const previewActions = document.querySelector("#preview-actions");
const confirmMove = document.querySelector("#confirm-move");
const cancelPreview = document.querySelector("#cancel-preview");
let game = newGame();
let selected = null;
let targets = [];
let focusedSquare = 0;
let preview = null;
let activeSquare = null;
let candidates = [];
let decorations = [];

const name = player => player === WHITE ? "White" : "Black";
const squareName = square => `${"abcdefgh"[square % 8]}${Math.floor(square / 8) + 1}`;

function render() {
  candidates = [];
  if (!game.pending && !game.reason && !game.winner) {
    const sources = selected === null ? game.board.map((_, i) => i) : [selected];
    for (const from of sources) {
      for (const to of legalMoves(game, from)) {
        if (game.board[to] && (!preview || preview.to === to)) {
          candidates.push({ ...move(game, from, to).pending, from, to });
        }
      }
    }
  }
  previewActions.hidden = !preview;
  if (game.winner) {
    status.textContent = `${name(game.winner)} wins — ${game.reason === "docked" ? "fleet docked" : "opposing ship trapped"}!`;
    hint.textContent = "Start a new game to play again.";
  } else if (game.reason) {
    status.textContent = `Draw — ${game.reason === "repetition" ? "position repeated" : "no legal moves"}.`;
    hint.textContent = "Start a new game to play again.";
  } else if (game.pending) {
    status.textContent = `${name(game.pending.player)}: choose an escape`;
    hint.textContent = "Choose a highlighted square at least four diagonal spaces away.";
  } else if (preview) {
    status.textContent = `${name(game.turn)} to move`;
    hint.textContent = `${name(preview.player)} can escape to ${preview.choices.map(squareName).join(", ")} (green E markers). Confirm the move; ${name(preview.player)} chooses the escape.`;
  } else {
    status.textContent = `${name(game.turn)} to move`;
    hint.textContent = selected === null ? "Choose one of your ships." : "Choose a highlighted destination, or select another ship.";
  }

  boardElement.replaceChildren();
  decorations = [];
  for (let square = 0; square < 64; square++) {
    const button = document.createElement("button");
    const piece = game.board[square];
    const marked = game.pending ? game.pending.choices.includes(square) : !preview && targets.includes(square);
    button.type = "button";
    button.tabIndex = square === focusedSquare ? 0 : -1;
    button.className = `square ${(Math.floor(square / 8) + square % 8) % 2 ? "dark" : "light"}`;
    if (selected === square) button.classList.add("selected");
    if (marked) button.classList.add("target");
    if (preview?.to === square) button.classList.add("preview-target");
    const label = `${squareName(square)}, ${piece ? `${name(piece)} ship` : "empty"}${marked ? ", available destination" : ""}${selected === square ? ", selected" : ""}${preview?.to === square ? ", previewed opponent" : ""}`;
    if (piece) {
      const ship = document.createElement("span");
      ship.className = `ship ${piece}`;
      ship.setAttribute("aria-hidden", "true");
      ship.textContent = piece === WHITE ? "✦" : "◆";
      button.append(ship);
    } else if (marked) {
      const marker = document.createElement("span");
      marker.className = "marker";
      button.append(marker);
    }
    const escapeMarker = document.createElement("span");
    escapeMarker.className = "escape-marker";
    escapeMarker.setAttribute("aria-hidden", "true");
    escapeMarker.textContent = "E";
    button.append(escapeMarker);
    const captureMarker = document.createElement("span");
    captureMarker.className = "capture-marker";
    captureMarker.setAttribute("aria-hidden", "true");
    captureMarker.textContent = "C";
    button.append(captureMarker);
    decorations.push({ button, label, escapeMarker, captureMarker });
    button.addEventListener("focus", () => {
      const previous = boardElement.children[focusedSquare];
      if (previous) previous.tabIndex = -1;
      focusedSquare = square;
      button.tabIndex = 0;
      activeSquare = square;
      updateHighlights();
    });
    button.addEventListener("pointerenter", () => {
      activeSquare = square;
      updateHighlights();
    });
    button.addEventListener("click", () => select(square));
    boardElement.append(button);
  }
  updateHighlights();
}

function updateHighlights() {
  const escapes = preview ? candidates : candidates.filter(option =>
    option.from === activeSquare || option.to === activeSquare);
  opportunities.textContent = escapes.length
    ? `Possible displacements (C = opponent, E = escape): ${escapes.map(option =>
      `${squareName(option.from)} → ${squareName(option.to)}: ${option.choices.map(squareName).join(", ")}`).join("; ")}.`
    : "";
  opportunities.hidden = !escapes.length;
  for (let square = 0; square < decorations.length; square++) {
    const { button, label, escapeMarker, captureMarker } = decorations[square];
    const escapeFor = escapes.filter(option => option.choices.includes(square));
    const captureBy = escapes.filter(option => option.to === square);
    button.classList.toggle("escape-preview", escapeFor.length > 0);
    escapeMarker.hidden = !escapeFor.length;
    captureMarker.hidden = !captureBy.length;
    button.setAttribute("aria-label", `${label}${escapeFor.length ? `, escape option after move (${escapeFor.map(option => `${squareName(option.from)} to ${squareName(option.to)}`).join("; ")})` : ""}${captureBy.length && !preview ? `, can be displaced from ${captureBy.map(option => squareName(option.from)).join(", ")}` : ""}`);
  }
}

function select(square) {
  if (game.winner || game.reason) return;
  focusedSquare = square;
  if (preview) {
    boardElement.children[square].focus();
    return;
  } else if (game.pending) {
    if (game.pending.choices.includes(square)) {
      game = displace(game, square);
      selected = null;
      targets = [];
    }
  } else if (selected !== null && targets.includes(square)) {
    if (game.board[square]) {
      const { pending } = move(game, selected, square);
      preview = { ...pending, to: square };
    } else {
      game = move(game, selected, square);
      selected = null;
      targets = [];
      preview = null;
    }
  } else if (game.board[square] === game.turn) {
    selected = square;
    targets = legalMoves(game, square);
    preview = null;
  }
  render();
  boardElement.children[square].focus();
}

boardElement.addEventListener("keydown", event => {
  const square = Array.prototype.indexOf.call(boardElement.children, event.target);
  if (square < 0) return;
  const x = square % 8, y = Math.floor(square / 8);
  const destination = {
    ArrowLeft: x > 0 ? square - 1 : square,
    ArrowRight: x < 7 ? square + 1 : square,
    ArrowUp: y > 0 ? square - 8 : square,
    ArrowDown: y < 7 ? square + 8 : square
  }[event.key];
  if (destination === undefined) return;
  event.preventDefault();
  boardElement.children[square].tabIndex = -1;
  focusedSquare = destination;
  boardElement.children[destination].tabIndex = 0;
  boardElement.children[destination].focus();
});

boardElement.addEventListener("pointerleave", () => {
  activeSquare = null;
  updateHighlights();
});

confirmMove.addEventListener("click", () => {
  if (!preview) return;
  const to = preview.to;
  game = move(game, selected, to);
  selected = null;
  targets = [];
  preview = null;
  focusedSquare = to;
  render();
  boardElement.children[to].focus();
});

cancelPreview.addEventListener("click", () => {
  if (!preview) return;
  const square = preview.to;
  preview = null;
  focusedSquare = square;
  render();
  boardElement.children[square].focus();
});

restart.addEventListener("click", () => {
  game = newGame();
  selected = null;
  targets = [];
  focusedSquare = 0;
  preview = null;
  activeSquare = null;
  render();
});
render();

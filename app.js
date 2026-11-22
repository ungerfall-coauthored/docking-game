import { BLACK, WHITE, displace, legalMoves, move, newGame } from "./engine.js";
import { chooseComputerAction } from "./computer.js";

const boardElement = document.querySelector("#board");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const opportunities = document.querySelector("#opportunities");
const restart = document.querySelector("#restart");
const mode = document.querySelector("#mode");
let game = newGame();
let selected = null;
let targets = [];
let focusedSquare = 0;
let activeSquare = null;
let hoverSquare = null;
let focusSquare = null;
let candidates = [];
let decorations = [];
let computerTimer = null;
let computerError = false;

const name = player => player === WHITE ? "White" : "Black";
const squareName = square => `${"abcdefgh"[square % 8]}${Math.floor(square / 8) + 1}`;
const computerTurn = () => mode.value === "computer" && !game.winner && !game.reason
  && (game.pending ? game.pending.player : game.turn) === BLACK;

function render() {
  candidates = [];
  if (!game.pending && !game.reason && !game.winner && !computerTurn()) {
    const sources = selected === null ? game.board.map((_, i) => i) : [selected];
    for (const from of sources) {
      for (const to of legalMoves(game, from)) {
        if (game.board[to]) {
          candidates.push({ ...move(game, from, to).pending, from, to });
        }
      }
    }
  }
  if (game.winner) {
    status.textContent = `${name(game.winner)} wins — ${game.reason === "docked" ? "fleet docked" : "opposing ship trapped"}!`;
    hint.textContent = "Start a new game to play again.";
  } else if (game.reason) {
    status.textContent = `Draw — ${game.reason === "repetition" ? "position repeated" : "no legal moves"}.`;
    hint.textContent = "Start a new game to play again.";
  } else if (computerError) {
    status.textContent = "Computer could not move";
    hint.textContent = "Start a new game to try again.";
  } else if (computerTurn()) {
    status.textContent = game.pending ? "Computer: choosing an escape" : "Computer: thinking";
    hint.textContent = "You play White.";
  } else if (game.pending) {
    status.textContent = `${name(game.pending.player)}: choose an escape`;
    hint.textContent = "Choose a highlighted square at least four diagonal spaces away.";
  } else {
    status.textContent = `${name(game.turn)} to move`;
    hint.textContent = selected === null ? "Choose one of your ships." : "Choose a highlighted destination, or select another ship.";
  }

  boardElement.replaceChildren();
  decorations = [];
  for (let square = 0; square < 64; square++) {
    const button = document.createElement("button");
    const piece = game.board[square];
    const marked = game.pending ? game.pending.choices.includes(square) : targets.includes(square);
    button.type = "button";
    button.tabIndex = square === focusedSquare ? 0 : -1;
    button.className = `square ${(Math.floor(square / 8) + square % 8) % 2 ? "dark" : "light"}`;
    if (selected === square) button.classList.add("selected");
    if (marked) button.classList.add("target");
    const label = `${squareName(square)}, ${piece ? `${name(piece)} ship` : "empty"}${marked ? ", available destination" : ""}${selected === square ? ", selected" : ""}`;
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
      focusSquare = square;
      activeSquare = square;
      updateHighlights();
    });
    button.addEventListener("pointerenter", () => {
      hoverSquare = square;
      activeSquare = square;
      updateHighlights();
    });
    button.addEventListener("click", () => select(square));
    boardElement.append(button);
  }
  updateHighlights();
}

function updateHighlights() {
  const escapes = candidates.filter(option =>
    option.from === activeSquare || option.to === activeSquare);
  opportunities.textContent = escapes.length
    ? `Possible displacements (C = opponent, E = escape): ${escapes.map(option =>
      `${squareName(option.from)} → ${squareName(option.to)}: ${option.choices.map(squareName).join(", ")}`).join("; ")}.`
    : "";
  for (let square = 0; square < decorations.length; square++) {
    const { button, label, escapeMarker, captureMarker } = decorations[square];
    const escapeFor = escapes.filter(option => option.choices.includes(square));
    const captureBy = escapes.filter(option => option.to === square);
    button.classList.toggle("escape-preview", escapeFor.length > 0);
    escapeMarker.hidden = !escapeFor.length;
    captureMarker.hidden = !captureBy.length;
    button.setAttribute("aria-label", `${label}${escapeFor.length ? `, escape option after move (${escapeFor.map(option => `${squareName(option.from)} to ${squareName(option.to)}`).join("; ")})` : ""}${captureBy.length ? `, can be displaced from ${captureBy.map(option => squareName(option.from)).join(", ")}` : ""}`);
  }
}

function select(square) {
  if (game.winner || game.reason || computerTurn() || computerError) return;
  focusedSquare = square;
  if (game.pending) {
    if (game.pending.choices.includes(square)) {
      game = displace(game, square);
      selected = null;
      targets = [];
    }
  } else if (selected !== null && targets.includes(square)) {
    game = move(game, selected, square);
    selected = null;
    targets = [];
  } else if (game.board[square] === game.turn) {
    selected = square;
    targets = legalMoves(game, square);
  }
  render();
  boardElement.children[square].focus();
  scheduleComputer();
}

function scheduleComputer() {
  if (!computerTurn() || computerError || computerTimer !== null) return;
  computerTimer = setTimeout(() => {
    computerTimer = null;
    if (!computerTurn()) return;
    const action = chooseComputerAction(game);
    if (!action) {
      computerError = true;
    } else {
      game = action.escape !== undefined
        ? displace(game, action.escape)
        : move(game, action.from, action.to);
    }
    const restoreFocus = Array.from(boardElement.children).includes(document.activeElement);
    render();
    if (restoreFocus) boardElement.children[focusedSquare].focus();
    scheduleComputer();
  }, 250);
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
  hoverSquare = null;
  activeSquare = focusSquare;
  updateHighlights();
});

boardElement.addEventListener("focusout", () => {
  focusSquare = null;
  activeSquare = hoverSquare;
  updateHighlights();
});

function startGame() {
  if (computerTimer !== null) clearTimeout(computerTimer);
  computerTimer = null;
  computerError = false;
  game = newGame();
  selected = null;
  targets = [];
  focusedSquare = 0;
  activeSquare = null;
  hoverSquare = null;
  focusSquare = null;
  render();
}
restart.addEventListener("click", startGame);
mode.addEventListener("change", startGame);
render();

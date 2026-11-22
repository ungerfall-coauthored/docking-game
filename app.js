import { BLACK, WHITE, displace, legalMoves, move, newGame } from "./engine.js";

const boardElement = document.querySelector("#board");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const restart = document.querySelector("#restart");
let game = newGame();
let selected = null;
let targets = [];
let focusedSquare = 0;

const name = player => player === WHITE ? "White" : "Black";
const squareName = square => `${"abcdefgh"[square % 8]}${Math.floor(square / 8) + 1}`;

function render() {
  if (game.winner) {
    status.textContent = `${name(game.winner)} wins — ${game.reason === "docked" ? "fleet docked" : "opposing ship trapped"}!`;
    hint.textContent = "Start a new game to play again.";
  } else if (game.reason) {
    status.textContent = `Draw — ${game.reason === "repetition" ? "position repeated" : "no legal moves"}.`;
    hint.textContent = "Start a new game to play again.";
  } else if (game.pending) {
    status.textContent = `${name(game.pending.player)}: choose an escape`;
    hint.textContent = "Choose a highlighted square at least four diagonal spaces away.";
  } else {
    status.textContent = `${name(game.turn)} to move`;
    hint.textContent = selected === null ? "Choose one of your ships." : "Choose a highlighted destination, or select another ship.";
  }

  boardElement.replaceChildren();
  for (let square = 0; square < 64; square++) {
    const button = document.createElement("button");
    const piece = game.board[square];
    const marked = game.pending ? game.pending.choices.includes(square) : targets.includes(square);
    button.type = "button";
    button.tabIndex = square === focusedSquare ? 0 : -1;
    button.className = `square ${(Math.floor(square / 8) + square % 8) % 2 ? "dark" : "light"}`;
    if (selected === square) button.classList.add("selected");
    if (marked) button.classList.add("target");
    button.setAttribute("aria-label", `${squareName(square)}, ${piece ? `${name(piece)} ship` : "empty"}${marked ? ", available destination" : ""}${selected === square ? ", selected" : ""}`);
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
    button.addEventListener("focus", () => {
      const previous = boardElement.children[focusedSquare];
      if (previous) previous.tabIndex = -1;
      focusedSquare = square;
      button.tabIndex = 0;
    });
    button.addEventListener("click", () => select(square));
    boardElement.append(button);
  }
}

function select(square) {
  if (game.winner || game.reason) return;
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

restart.addEventListener("click", () => {
  game = newGame();
  selected = null;
  targets = [];
  focusedSquare = 0;
  render();
});
render();

# Docking

A two-player, pass-and-play board game inspired by "Стыковка" (Docking),
pages 409–412 of [the source book](https://djvu.online/file/Q65rmYCZMvkfx).
Play the hosted site in a modern browser, or serve this directory as static
files (opening `index.html` directly does not load its JavaScript modules):

```sh
python3 -m http.server 8000
```

Visit <http://localhost:8000/>. The game has no build step or external runtime
services. Run its engine tests with `node --test`.

## Rules

Each fleet has eight ships on an 8×8 board. White starts; players alternate.
Connect all of your ships orthogonally to win. A ship moves in any of eight
directions exactly as many squares as there are ships on that **ray**, including
itself. It can jump friendly ships but not enemies; its destination cannot
contain a friendly ship.

Landing on an enemy is allowed only if that ship has a clear diagonal escape
of at least four squares. Select an enemy destination to preview its escape
options before confirming the move. The displaced captain then chooses an empty square
at least four squares away along a clear diagonal. A ship surrounded on all
four orthogonal sides by enemy ships crashes, and its fleet loses.

The book does not specify who chooses a displacement destination, the exact
distance on a longer clear diagonal, the first player, or tie handling. This
implementation uses the captain's choice and a four-square minimum, starts
white, awards simultaneous docking to the moving player, and treats threefold
repetition of a position with the same player to move or having no legal move
as a draw. A crash takes precedence over docking; if both fleets crash, the
moving player wins. Board edges do not count as enemy ships for a crash.

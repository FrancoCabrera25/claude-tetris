# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ejecutar el proyecto

No hay build, ni tests, ni linter, ni `package.json`: nada que instalar.

```bash
open index.html                # macOS
python3 -m http.server 8000    # alternativa con servidor local
```

Verificar cambios = recargar el navegador.

## Arquitectura

- `game.js:31-41` cachea todas las referencias del DOM al nivel superior y `init()` se invoca
  al final del archivo (`game.js:305`). Esto solo funciona porque `<script src="game.js">` va al
  final de `<body>` sin `defer` (`index.html:55`); mover el script al `<head>` rompe el juego.
- Todo el estado vive en variables globales `let` (`game.js:43`) que `init()` reinicia. `init()`
  es a la vez el arranque inicial y el handler del botón de reinicio (`game.js:302`).
- **Invariante clave**: el valor de una celda del tablero es simultáneamente el tipo de pieza,
  el índice en `COLORS` y el índice en `PIECES` (1–7; `0` = vacío). Las matrices de `PIECES` se
  rellenan con su propio índice. Añadir o reordenar una pieza obliga a tocar `COLORS` y `PIECES`
  en paralelo.
- **Invariante de dimensiones**: `<canvas id="board">` está fijado a 300×600 en `index.html:12`
  y debe coincidir con `COLS*BLOCK` × `ROWS*BLOCK`. `#next-canvas` es 120×120 = 4×4 celdas del
  `NB = 30` hardcodeado en `drawNext()` (`game.js:211`), independiente de `BLOCK`.
- Bucle de juego (`loop`, `game.js:243`): `requestAnimationFrame` acumulando `dt` contra
  `dropInterval`. Pausa y game over cancelan `animId`; al reanudar hay que reiniciar `lastTime`
  antes de volver a llamar a `loop`, o el primer `dt` incluye toda la pausa.
- `draw()` repinta el frame completo cada vez (grid → tablero → ghost → pieza actual, en ese
  orden); no hay render incremental.
- El mismo `#overlay` se reutiliza para PAUSA y GAME OVER cambiando su texto (`togglePause`,
  `endGame`).
- El HUD no se refresca solo: hay que llamar a `updateHUD()` tras cualquier mutación de
  `score` / `lines` / `level`.

## Convenciones

- ES6+ vanilla, `'use strict'`, sin módulos ni imports: todo vive en un único scope global.
- El proyecto está íntegramente en español: UI, README y comentarios.

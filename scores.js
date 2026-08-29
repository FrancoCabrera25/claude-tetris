'use strict';

// scores.js — Tabla de records local, pantalla de inicio y sistema de combos.
// Se apoya en los hooks (`on`/`emit`) y en las variables/funciones globales
// (`score`/`lines`/`animId`/`lockPiece`/`init`...) que expone game.js: como el
// proyecto no usa módulos, todo comparte el mismo scope global y este archivo
// puede leerlas y, cuando hace falta, reasignarlas directamente.

const SCORES_KEY = 'tetris-scores';
const STATS_KEY = 'tetris-stats';
const LAST_RECORD_KEY = 'tetris-last-record';
const MAX_SCORES = 5;

const startScreen = document.getElementById('start-screen');

let comboActual = 0;
let comboMax = 0;
let pantallaInicioVisible = true;

// --- Persistencia: records ---

function getScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveScores(list) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(list));
  } catch {
    // localStorage puede fallar (privado, cuota, deshabilitado): no rompemos la UI.
  }
}

function entraAlTop5(puntuacion, records) {
  return records.length < MAX_SCORES || puntuacion > records[records.length - 1].puntuacion;
}

function agregarRecord(nombre, puntuacion, lineas, mejorCombo) {
  const records = getScores();
  const nuevo = { nombre, puntuacion, lineas, mejorCombo, ts: Date.now() };
  records.push(nuevo);
  records.sort((a, b) => b.puntuacion - a.puntuacion);
  records.length = Math.min(records.length, MAX_SCORES);
  saveScores(records);
  try {
    localStorage.setItem(LAST_RECORD_KEY, String(nuevo.ts));
  } catch {
    // idem: si localStorage falla, el resaltado al volver a la pantalla de
    // inicio simplemente no se aplica.
  }
  return { records, ts: nuevo.ts };
}

// --- Persistencia: estadísticas globales (mejor combo / líneas máximas) ---
// Independientes del top 5: una partida puede batir el propio récord de combo
// o de líneas sin llegar a anotar una puntuación suficiente para la tabla.

function getStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    if (raw && typeof raw === 'object') {
      return { mejorCombo: Number(raw.mejorCombo) || 0, maxLineas: Number(raw.maxLineas) || 0 };
    }
  } catch {
    // sigue abajo con el valor por defecto
  }
  return { mejorCombo: 0, maxLineas: 0 };
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // no rompemos la UI si localStorage falla
  }
}

function resetRecords() {
  saveScores([]);
  saveStats({ mejorCombo: 0, maxLineas: 0 });
  try {
    localStorage.removeItem(LAST_RECORD_KEY);
  } catch {
    // no crítico
  }
}

// --- Render: tabla de records y estadísticas ---

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// `highlightTs` resalta el record cuyo `ts` coincide (usado para el último
// record guardado). Una fila con `pending: true` es una posición provisional
// —la partida recién terminada, antes de guardar el nombre— y se resalta y
// marca como tal sin necesidad de `ts`.
function renderTablaRecords(records, highlightTs) {
  if (!records.length) {
    return '<p class="scores-empty">Todavía no hay records. ¡Sé el primero en anotar!</p>';
  }
  const filas = records.map((r, i) => {
    const esActual = r.pending || (highlightTs != null && r.ts === highlightTs);
    const clases = [esActual ? 'scores-highlight' : '', r.pending ? 'scores-pending' : ''].filter(Boolean).join(' ');
    return `
    <tr class="${clases}">
      <td>${i + 1}</td>
      <td>${r.pending ? '—' : escapeHTML(r.nombre)}</td>
      <td>${(r.puntuacion || 0).toLocaleString()}</td>
      <td>${r.lineas || 0}</td>
      <td>${r.mejorCombo || 0}</td>
    </tr>
  `;
  }).join('');
  return `
    <table class="scores-table">
      <thead>
        <tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

// Inserta una fila provisional (partida recién terminada, todavía sin
// nombre) en la posición que le correspondería dentro del top 5, para
// mostrar de antemano en qué puesto quedaría antes de guardar.
function buildRecordsConPendiente(records, pendiente) {
  const items = [...records, pendiente];
  items.sort((a, b) => b.puntuacion - a.puntuacion);
  items.length = Math.min(items.length, MAX_SCORES);
  return items;
}

function renderStats(stats) {
  return `
    <div class="scores-stats">
      <div class="scores-stat">
        <span class="scores-stat-label">Mejor combo</span>
        <span class="scores-stat-value">${stats.mejorCombo || 0}</span>
      </div>
      <div class="scores-stat">
        <span class="scores-stat-label">Máx. líneas</span>
        <span class="scores-stat-value">${stats.maxLineas || 0}</span>
      </div>
    </div>
  `;
}

// --- Reset de records: botón + confirmación inline (evita el confirm()
// nativo, que en el overlay de game over le robaría el foco al input de
// nombre). `container` es un elemento vacío que este helper puebla y
// repuebla a medida que el usuario avanza en la confirmación.
function bindResetBtn(container, onDone) {
  if (!container) return;
  container.innerHTML = '<button class="scores-reset-btn" type="button">Resetear records</button>';
  container.querySelector('.scores-reset-btn').addEventListener('click', () => {
    container.innerHTML = `
      <div class="scores-reset-confirm">
        <span>¿Seguro?</span>
        <button class="scores-reset-yes" type="button">Sí</button>
        <button class="scores-reset-no" type="button">Cancelar</button>
      </div>
    `;
    container.querySelector('.scores-reset-yes').addEventListener('click', () => {
      resetRecords();
      onDone();
    });
    container.querySelector('.scores-reset-no').addEventListener('click', () => {
      bindResetBtn(container, onDone);
    });
  });
}

// --- Sistema de combos ---
// El combo se corta cuando una pieza bloquea sin despejar ninguna línea.
// game.js no expone un hook para ese evento puntual (solo 'linesCleared',
// que dispara únicamente si `cleared > 0`), así que envolvemos la función
// global `lockPiece` (game.js:151): al ser una declaración de función de
// nivel superior en un script clásico sin módulos, es reasignable desde acá
// sin tocar game.js. `hardDrop`, `softDrop` y `loop` la resuelven de forma
// dinámica por scope global en cada llamada, así que las tres rutas quedan
// cubiertas por el wrapper.
const lockPieceBase = lockPiece;
lockPiece = function () {
  const lineasAntes = lines;
  lockPieceBase();
  if (lines === lineasAntes) comboActual = 0;
};

on('init', () => {
  comboActual = 0;
  comboMax = 0;
  // Una partida nueva (inicio o "Reiniciar") también limpia cualquier resto
  // del formulario de guardado de la partida anterior en el overlay.
  const overlayExtra = document.getElementById('overlay-extra');
  if (overlayExtra) overlayExtra.innerHTML = '';
  // El init() inicial (al cargar la página, antes de pulsar "Jugar") no debe
  // dejar el juego corriendo detrás de la pantalla de inicio: si tardamos en
  // arrancar, encontraríamos el tablero sucio o directamente en game over.
  if (pantallaInicioVisible) cancelAnimationFrame(animId);
});

on('linesCleared', () => {
  comboActual++;
  comboMax = Math.max(comboMax, comboActual);
});

// --- Game over: actualizar estadísticas y guardar record si corresponde ---

function renderOverlayExtra() {
  const overlayExtra = document.getElementById('overlay-extra');
  if (!overlayExtra) return;

  // Las estadísticas globales se actualizan siempre, entre o no la partida
  // al top 5 (un combo o una racha de líneas récord pueden darse en una
  // partida de puntuación modesta).
  const stats = getStats();
  stats.mejorCombo = Math.max(stats.mejorCombo, comboMax);
  stats.maxLineas = Math.max(stats.maxLineas, lines);
  saveStats(stats);

  const records = getScores();
  const esNuevoRecord = entraAlTop5(score, records);

  overlayExtra.innerHTML = `
    ${esNuevoRecord ? `
      <div class="scores-save">
        <p class="scores-save-label">¡Nuevo record! Ingresá tu nombre:</p>
        <div class="scores-save-row">
          <input type="text" id="scores-name-input" maxlength="12" placeholder="Nombre" autocomplete="off" />
          <button id="scores-save-btn" type="button">Guardar</button>
        </div>
      </div>
    ` : ''}
    <div id="overlay-stats">${renderStats(stats)}</div>
    <div id="scores-table-container"></div>
    <div id="overlay-reset-container"></div>
  `;

  const tabla = overlayExtra.querySelector('#scores-table-container');

  if (esNuevoRecord) {
    const pendiente = { puntuacion: score, lineas: lines, mejorCombo: comboMax, pending: true };
    tabla.innerHTML = renderTablaRecords(buildRecordsConPendiente(records, pendiente), null);

    const input = overlayExtra.querySelector('#scores-name-input');
    const saveBtn = overlayExtra.querySelector('#scores-save-btn');
    input.focus();

    const guardar = () => {
      const nombre = input.value.trim() || 'Jugador';
      const { records: nuevosRecords, ts } = agregarRecord(nombre, score, lines, comboMax);
      overlayExtra.querySelector('.scores-save')?.remove();
      tabla.innerHTML = renderTablaRecords(nuevosRecords, ts);
    };
    saveBtn.addEventListener('click', guardar);
    input.addEventListener('keydown', e => {
      if (e.code === 'Enter') guardar();
    });
  } else {
    const lastTs = parseInt(localStorage.getItem(LAST_RECORD_KEY), 10) || null;
    tabla.innerHTML = renderTablaRecords(records, lastTs);
  }

  bindResetBtn(overlayExtra.querySelector('#overlay-reset-container'), renderOverlayExtra);
}

on('gameOver', renderOverlayExtra);

// --- Pantalla de inicio ---

function renderStartScreen() {
  const records = getScores();
  const stats = getStats();
  const lastTs = parseInt(localStorage.getItem(LAST_RECORD_KEY), 10) || null;

  startScreen.innerHTML = `
    <div class="start-box">
      <h1 class="start-title">TETRIS <span>NEON</span></h1>
      <div id="start-scores">
        ${renderStats(stats)}
        ${renderTablaRecords(records, lastTs)}
      </div>
      <div class="start-actions">
        <button id="start-play-btn" type="button">Jugar</button>
        <div id="start-reset-container"></div>
      </div>
    </div>
  `;

  startScreen.querySelector('#start-play-btn').addEventListener('click', () => {
    pantallaInicioVisible = false;
    startScreen.classList.add('hidden');
    // Arranca una partida limpia: init() cancela cualquier frame pendiente y
    // reinicia lastTime/dropAccum, así que no hay doble requestAnimationFrame
    // con el init() inicial que quedó cancelado por el hook de arriba.
    init();
  });

  bindResetBtn(startScreen.querySelector('#start-reset-container'), renderStartScreen);
}

// La pantalla de inicio bloquea los inputs del juego mientras esté visible.
// El init() inicial del patch base sigue corriendo de fondo (oculto detrás de
// #start-screen por z-index, y ahora además con su loop cancelado — ver el
// hook 'init' de arriba), así que no hace falta interceptar el arranque.
on('inputLock', () => pantallaInicioVisible);

// El listener de teclado de game.js atiende 'KeyP' (pausa) ANTES de consultar
// inputLocked(), así que ese caso puntual no queda cubierto por el hook. Lo
// tapamos acá con un listener en fase de captura que corta la propagación
// antes de que el listener de game.js (fase de burbujeo) llegue a ejecutarse,
// sin tener que tocar game.js.
document.addEventListener('keydown', e => {
  if (pantallaInicioVisible) e.stopImmediatePropagation();
}, true);

on('ready', renderStartScreen);

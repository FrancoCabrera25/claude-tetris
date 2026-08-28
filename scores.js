'use strict';

// scores.js — Tabla de records local, pantalla de inicio y sistema de combos.
// Se apoya en los hooks (`on`/`emit`) y en las variables globales `score`/`lines`
// que expone game.js: como el proyecto no usa módulos, todo comparte el mismo
// scope global y este archivo puede leerlas directamente.

const SCORES_KEY = 'tetris-scores';
const MAX_SCORES = 5;
const COMBO_TIMEOUT_MS = 2000; // ver nota sobre la limitación del combo, más abajo

const startScreen = document.getElementById('start-screen');

let comboActual = 0;
let comboMax = 0;
let comboTimer = null;
let pantallaInicioVisible = true;

// --- Persistencia ---

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
  const nuevo = { nombre, puntuacion, lineas, mejorCombo };
  records.push(nuevo);
  records.sort((a, b) => b.puntuacion - a.puntuacion);
  records.length = Math.min(records.length, MAX_SCORES);
  saveScores(records);
  return { records, indice: records.indexOf(nuevo) };
}

// --- Render de la tabla ---

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTablaRecords(records, highlightIndex) {
  if (!records.length) {
    return '<p class="scores-empty">Todavía no hay records. ¡Sé el primero en anotar!</p>';
  }
  const filas = records.map((r, i) => `
    <tr class="${i === highlightIndex ? 'scores-highlight' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHTML(r.nombre)}</td>
      <td>${(r.puntuacion || 0).toLocaleString()}</td>
      <td>${r.lineas || 0}</td>
      <td>${r.mejorCombo || 0}</td>
    </tr>
  `).join('');
  return `
    <table class="scores-table">
      <thead>
        <tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

// --- Sistema de combos ---
// Limitación conocida: el patch base compartido solo emite 'linesCleared' cuando
// se despeja al menos una línea (cleared > 0); no existe un hook para "una pieza
// bloqueó sin despejar ninguna línea", que sería la señal ideal para cortar el
// combo. Como aproximación aceptable, el combo se lleva por tiempo: se incrementa
// en cada 'linesCleared' y se considera roto (vuelve a 0) si pasan más de
// COMBO_TIMEOUT_MS sin un nuevo despeje. También se reinicia al arrancar partida.
on('init', () => {
  comboActual = 0;
  comboMax = 0;
  clearTimeout(comboTimer);
  // Una partida nueva (inicio o "Reiniciar") también limpia cualquier resto
  // del formulario de guardado de la partida anterior en el overlay.
  const overlayExtra = document.getElementById('overlay-extra');
  if (overlayExtra) overlayExtra.innerHTML = '';
});

on('linesCleared', () => {
  comboActual++;
  comboMax = Math.max(comboMax, comboActual);
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { comboActual = 0; }, COMBO_TIMEOUT_MS);
});

// Mientras el juego está en pausa no hay reloj de juego avanzando, así que
// el combo tampoco debería decaer por tiempo real: cortamos el timer al
// pausar y lo reiniciamos (con la ventana completa) al reanudar.
on('pause', () => clearTimeout(comboTimer));
on('resume', () => {
  if (comboActual > 0) {
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboActual = 0; }, COMBO_TIMEOUT_MS);
  }
});

// --- Game over: guardar record si corresponde ---

function renderOverlayExtra() {
  const overlayExtra = document.getElementById('overlay-extra');
  if (!overlayExtra) return;
  const records = getScores();

  if (entraAlTop5(score, records)) {
    overlayExtra.innerHTML = `
      <div class="scores-save">
        <p class="scores-save-label">¡Nuevo record! Ingresá tu nombre:</p>
        <div class="scores-save-row">
          <input type="text" id="scores-name-input" maxlength="12" placeholder="Nombre" autocomplete="off" />
          <button id="scores-save-btn">Guardar</button>
        </div>
      </div>
      <div id="scores-table-container"></div>
    `;
    overlayExtra.querySelector('#scores-table-container').innerHTML = renderTablaRecords(records, -1);

    const input = overlayExtra.querySelector('#scores-name-input');
    const saveBtn = overlayExtra.querySelector('#scores-save-btn');
    input.focus();

    const guardar = () => {
      const nombre = input.value.trim() || 'Jugador';
      const { records: nuevosRecords, indice } = agregarRecord(nombre, score, lines, comboMax);
      overlayExtra.innerHTML = '<div id="scores-table-container"></div>';
      overlayExtra.querySelector('#scores-table-container').innerHTML = renderTablaRecords(nuevosRecords, indice);
    };
    saveBtn.addEventListener('click', guardar);
    input.addEventListener('keydown', e => {
      if (e.code === 'Enter') guardar();
    });
  } else {
    overlayExtra.innerHTML = '<div id="scores-table-container"></div>';
    overlayExtra.querySelector('#scores-table-container').innerHTML = renderTablaRecords(records, -1);
  }
}

on('gameOver', renderOverlayExtra);

// --- Pantalla de inicio ---

function renderStartScreen() {
  const records = getScores();
  startScreen.innerHTML = `
    <div class="start-box">
      <h1 class="start-title">TETRIS <span>NEON</span></h1>
      <div id="start-scores">${renderTablaRecords(records, -1)}</div>
      <div class="start-actions">
        <button id="start-play-btn">Jugar</button>
        <button id="start-reset-btn">Resetear records</button>
      </div>
    </div>
  `;

  startScreen.querySelector('#start-play-btn').addEventListener('click', () => {
    pantallaInicioVisible = false;
    startScreen.classList.add('hidden');
  });

  startScreen.querySelector('#start-reset-btn').addEventListener('click', () => {
    if (confirm('¿Seguro que querés borrar todos los records guardados? Esta acción no se puede deshacer.')) {
      saveScores([]);
      renderStartScreen();
    }
  });
}

// La pantalla de inicio bloquea los inputs del juego mientras esté visible.
// El init() inicial del patch base sigue corriendo de fondo (oculto detrás de
// #start-screen por z-index), así que no hace falta interceptar el arranque.
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

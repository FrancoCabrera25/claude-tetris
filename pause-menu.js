'use strict';

// Menú de pausa completo: se engancha al bus de hooks expuesto por game.js
// (on/emit/hooks/inputLocked/startLevel/togglePause/init son variables y
// funciones globales porque este script, igual que game.js, no usa módulos).

const START_LEVEL_KEY = 'tetris-start-level';

let menuOpen = false;
let menuView = 'main'; // 'main' | 'controls'

const wrapper = document.querySelector('.wrapper');

const pauseMenu = document.createElement('div');
pauseMenu.id = 'pause-menu';
pauseMenu.className = 'pause-menu pause-menu-hidden';
pauseMenu.innerHTML = `
  <div class="pause-menu-box">
    <p class="pause-menu-title">PAUSA</p>

    <div id="pm-view-main" class="pause-menu-view">
      <button id="pm-resume" class="pm-btn pm-btn-primary" type="button">Reanudar</button>
      <button id="pm-restart" class="pm-btn" type="button">Reiniciar</button>
      <button id="pm-controls" class="pm-btn" type="button">Ver controles</button>
      <div class="pm-level-row">
        <label for="pm-level-select">Nivel inicial</label>
        <select id="pm-level-select"></select>
      </div>
    </div>

    <div id="pm-view-controls" class="pause-menu-view pause-menu-hidden">
      <ul class="pm-controls-list">
        <li><kbd>←</kbd><kbd>→</kbd> mover</li>
        <li><kbd>↑</kbd> rotar</li>
        <li><kbd>↓</kbd> bajar</li>
        <li><kbd>Space</kbd> caída</li>
        <li><kbd>P</kbd> pausa</li>
        <li><kbd>Esc</kbd> menú</li>
      </ul>
      <button id="pm-back" class="pm-btn" type="button">Volver</button>
    </div>
  </div>
`;

if (overlay && overlay.parentNode) {
  overlay.parentNode.insertBefore(pauseMenu, overlay.nextSibling);
} else if (wrapper) {
  wrapper.appendChild(pauseMenu);
}

const pmViewMain = pauseMenu.querySelector('#pm-view-main');
const pmViewControls = pauseMenu.querySelector('#pm-view-controls');
const pmResumeBtn = pauseMenu.querySelector('#pm-resume');
const pmRestartBtn = pauseMenu.querySelector('#pm-restart');
const pmControlsBtn = pauseMenu.querySelector('#pm-controls');
const pmBackBtn = pauseMenu.querySelector('#pm-back');
const pmLevelSelect = pauseMenu.querySelector('#pm-level-select');

for (let lvl = 1; lvl <= 10; lvl++) {
  const opt = document.createElement('option');
  opt.value = String(lvl);
  opt.textContent = String(lvl);
  pmLevelSelect.appendChild(opt);
}

function showView(view) {
  menuView = view;
  if (view === 'controls') {
    pmViewMain.classList.add('pause-menu-hidden');
    pmViewControls.classList.remove('pause-menu-hidden');
  } else {
    pmViewControls.classList.add('pause-menu-hidden');
    pmViewMain.classList.remove('pause-menu-hidden');
  }
}

function openMenu() {
  menuOpen = true;
  showView('main');
  pmLevelSelect.value = String(startLevel);
  // El overlay simple de PAUSA queda reemplazado visualmente por este menú.
  overlay.classList.add('hidden');
  pauseMenu.classList.remove('pause-menu-hidden');
}

function closeMenu() {
  menuOpen = false;
  showView('main');
  pauseMenu.classList.add('pause-menu-hidden');
}

pmResumeBtn.addEventListener('click', () => {
  togglePause();
});

pmRestartBtn.addEventListener('click', () => {
  init();
});

pmControlsBtn.addEventListener('click', () => {
  showView('controls');
});

pmBackBtn.addEventListener('click', () => {
  showView('main');
});

pmLevelSelect.addEventListener('change', () => {
  const value = Math.min(10, Math.max(1, parseInt(pmLevelSelect.value, 10) || 1));
  startLevel = value;
  localStorage.setItem(START_LEVEL_KEY, String(value));
});

document.addEventListener('keydown', e => {
  if (e.code !== 'Escape') return;
  if (gameOver) return;
  // Pausar/reanudar/cerrar el menú vía Escape, tanto desde la vista principal
  // como desde la sub-vista de controles.
  togglePause();
});

on('ready', () => {
  const saved = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (saved && saved >= 1 && saved <= 10) {
    startLevel = saved;
  }
});

on('pause', () => {
  openMenu();
});

on('resume', () => {
  closeMenu();
});

on('init', () => {
  // Cubre tanto "Reiniciar" del menú de pausa como el botón de GAME OVER:
  // si el menú estaba abierto, se cierra y el juego queda corriendo.
  closeMenu();
});

on('inputLock', () => menuOpen);

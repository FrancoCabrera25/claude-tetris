'use strict';

// --- Skins visuales ---
// Depende de las variables/funciones globales de game.js: activePalette, hooks, on(),
// draw(), drawNext(), current, COLORS.

const SKIN_KEY = 'tetris-skin';

const SKIN_PALETTES = {
  retro: COLORS,
  neon: [
    null,
    '#00f6ff', // I - cian
    '#fff700', // O - amarillo flúo
    '#ff00ea', // T - magenta
    '#39ff14', // S - verde flúo
    '#ff2079', // Z - rosa flúo
    '#7b2fff', // J - violeta
    '#ff9100', // L - naranja flúo
  ],
  pastel: [
    null,
    '#a8dadc', // I - celeste pastel
    '#ffe8a3', // O - amarillo pastel
    '#d6bbfb', // T - lila pastel
    '#b8e6b8', // S - verde pastel
    '#ffb3ba', // Z - rosa pastel
    '#bcd4ff', // J - azul pastel
    '#ffd3a3', // L - naranja pastel
  ],
  pixel: [
    null,
    '#00b8d4', // I
    '#ffd600', // O
    '#aa00ff', // T
    '#00c853', // S
    '#d50000', // Z
    '#304ffe', // J
    '#ff6d00', // L
  ],
};

let activeSkin = 'retro';

function drawSkinBlock(context, x, y, colorIndex, size, alpha) {
  const color = activePalette[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;

  context.globalAlpha = alpha ?? 1;

  if (activeSkin === 'neon') {
    context.shadowBlur = 12;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    context.shadowBlur = 0;
  } else if (activeSkin === 'pastel') {
    const radius = 6;
    context.fillStyle = color;
    context.beginPath();
    if (typeof context.roundRect === 'function') {
      context.roundRect(px, py, w, h, radius);
    } else {
      context.moveTo(px + radius, py);
      context.arcTo(px + w, py, px + w, py + h, radius);
      context.arcTo(px + w, py + h, px, py + h, radius);
      context.arcTo(px, py + h, px, py, radius);
      context.arcTo(px, py, px + w, py, radius);
      context.closePath();
    }
    context.fill();
  } else if (activeSkin === 'pixel') {
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    const half = w / 2;
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.fillRect(px, py, half, half);
    context.fillStyle = 'rgba(255, 255, 255, 0.12)';
    context.fillRect(px + half, py, w - half, half);
    context.fillStyle = 'rgba(0, 0, 0, 0.18)';
    context.fillRect(px, py + half, half, h - half);
    context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    context.fillRect(px + half, py + half, w - half, h - half);
  }

  context.globalAlpha = 1;
}

function setSkin(skin, repaint) {
  activeSkin = SKIN_PALETTES[skin] ? skin : 'retro';
  activePalette = SKIN_PALETTES[activeSkin];
  document.body.setAttribute('data-skin', activeSkin);

  // Retro usa el dibujo default de game.js: el hook drawBlock queda vacío.
  hooks.drawBlock.length = 0;
  if (activeSkin !== 'retro') {
    hooks.drawBlock.push(drawSkinBlock);
  }

  localStorage.setItem(SKIN_KEY, activeSkin);

  if (repaint && current) {
    draw();
    drawNext();
  }
}

function loadSkin() {
  const saved = localStorage.getItem(SKIN_KEY);
  return SKIN_PALETTES[saved] ? saved : 'retro';
}

const skinSelect = document.getElementById('skin-select');
const initialSkin = loadSkin();
skinSelect.value = initialSkin;
setSkin(initialSkin, false);

skinSelect.addEventListener('change', () => {
  setSkin(skinSelect.value, true);
});

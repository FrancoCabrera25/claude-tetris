'use strict';

// --- Skins visuales ---
// Depende de las variables/funciones globales de game.js: activePalette, hooks, on(),
// draw(), drawNext(), drawDefaultBlock(), refreshCanvasVars(), current, COLORS.
//
// data-skin vive en <html> (documentElement), igual que data-theme. Ante variables con
// la misma especificidad, gana la hoja enlazada después: skins.css va después de style.css
// en index.html, así que el skin siempre gana sobre el tema claro/oscuro — salvo Retro,
// que no define overrides propios y por eso sigue respondiendo al toggle de tema.

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

function drawNeonBlock(context, x, y, colorIndex, size, alpha) {
  const color = activePalette[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;

  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = 12;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(px, py, w, h);
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function drawPastelBlock(context, x, y, colorIndex, size, alpha) {
  const color = activePalette[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;
  const radius = 6;

  context.globalAlpha = alpha ?? 1;
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
  context.globalAlpha = 1;
}

// Matriz 4x4 fija de dithering (0 = nada, 1 = píxel claro, 2 = píxel oscuro). Debe ser
// determinista: draw() repinta el frame completo cada vez, así que un patrón aleatorio
// parpadearía en cada frame en vez de leerse como una textura fija.
const PIXEL_DITHER = [
  [1, 0, 2, 0],
  [0, 2, 0, 1],
  [2, 0, 1, 0],
  [0, 1, 0, 2],
];

function drawPixelBlock(context, x, y, colorIndex, size, alpha) {
  const color = activePalette[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;
  const cell = w / 4;

  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, w, h);

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const dot = PIXEL_DITHER[r][c];
      if (!dot) continue;
      context.fillStyle = dot === 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.28)';
      context.fillRect(Math.round(px + c * cell), Math.round(py + r * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }

  // Borde duro estilo 8-bit (sin anti-aliasing).
  context.fillStyle = 'rgba(255, 255, 255, 0.5)';
  context.fillRect(px, py, w, 2);
  context.fillRect(px, py, 2, h);
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.fillRect(px, py + h - 2, w, 2);
  context.fillRect(px + w - 2, py, 2, h);

  context.globalAlpha = 1;
}

const SKIN_DRAWERS = {
  retro: drawDefaultBlock,
  neon: drawNeonBlock,
  pastel: drawPastelBlock,
  pixel: drawPixelBlock,
};

// Dispatcher único, registrado una sola vez: elige el drawer según activeSkin en vez de
// que setSkin mute hooks.drawBlock, que borraría cualquier otro hook que se registrara ahí.
on('drawBlock', (context, x, y, colorIndex, size, alpha) => {
  SKIN_DRAWERS[activeSkin](context, x, y, colorIndex, size, alpha);
});

function setSkin(skin, repaint) {
  activeSkin = SKIN_PALETTES[skin] ? skin : 'retro';
  activePalette = SKIN_PALETTES[activeSkin];
  document.documentElement.setAttribute('data-skin', activeSkin);

  localStorage.setItem(SKIN_KEY, activeSkin);
  refreshCanvasVars();

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

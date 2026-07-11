// Loads Grok Imagine art for sprites, terrain tiles, and the title screen.
// Falls back gracefully if a file is missing (procedural painters still work).

const SPRITE_PATHS = {
  player: 'assets/sprites/diomedes.png',
  elite: 'assets/sprites/elite.png',
  archer: 'assets/sprites/archer.png',
  marksman: 'assets/sprites/marksman.png',
  sapper: 'assets/sprites/sapper.png',
  scout: 'assets/sprites/scout.png',
  fordGuard: 'assets/sprites/fordGuard.png',
  pursuitTroop: 'assets/sprites/pursuitTroop.png',
  ares: 'assets/sprites/ares.png',
  exitMap_down: 'assets/sprites/exitMap_down.png',
  exitMap_up: 'assets/sprites/exitMap_up.png',
  athenaStatue: 'assets/sprites/athenaStatue.png',
};

// Terrain textures keyed by board T.* values.
const TILE_PATHS = {
  ground: 'assets/tiles/ground.jpg',
  'burning-planks': 'assets/tiles/burning-planks.jpg',
  water: 'assets/tiles/water.jpg',
  ice: 'assets/tiles/ice.jpg',
  fire: 'assets/tiles/fire.jpg',
  stele: 'assets/tiles/stele.jpg',
};

const BG_PATHS = {
  gods: 'assets/bg/gods.jpg',
};

const images = new Map();
let ready = false;
let readyPromise = null;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function loadAssets() {
  if (readyPromise) return readyPromise;
  const all = {
    ...SPRITE_PATHS,
    ...Object.fromEntries(Object.entries(TILE_PATHS).map(([k, src]) => [`tile:${k}`, src])),
    ...Object.fromEntries(Object.entries(BG_PATHS).map(([k, src]) => [`bg:${k}`, src])),
  };
  readyPromise = Promise.all(
    Object.entries(all).map(async ([key, src]) => {
      const img = await loadImage(src);
      if (img) images.set(key, img);
    }),
  ).then(() => {
    ready = true;
    return images;
  });
  return readyPromise;
}

export function getSprite(key) {
  return images.get(key) || null;
}

export function getTile(terrain) {
  return images.get(`tile:${terrain}`) || null;
}

export function getBg(name) {
  return images.get(`bg:${name}`) || null;
}

export function assetsReady() {
  return ready;
}

/**
 * Draw a loaded sprite with feet planted on the hex (not floating / off-center).
 * Images should be transparent cutouts with mass roughly centered.
 */
export function drawSpriteImage(ctx, img, size, { alpha = 1, feet = true } = {}) {
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Scale to fill most of the hex; prefer height so tall spears/crests fit.
  const fit = size * (feet ? 1.95 : 1.85);
  const scale = fit / Math.max(img.width, img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  // Plant the sprite so the bottom of the art sits near the hex floor.
  const y = feet ? (size * 0.58 - h) : (-h / 2);
  ctx.drawImage(img, -w / 2, y, w, h);
  ctx.restore();
  return true;
}

/**
 * Draw a terrain texture into the current hex path (caller must clip or path).
 * Returns true if the image was drawn.
 */
export function drawTileImage(ctx, img, x, y, hexSize, hash = 0, { jitter = true, pan = false } = {}) {
  if (!img) return false;
  ctx.save();
  // Cover the hex fully (slight overscan so edges never show base fill).
  const cover = hexSize * 2.35;
  const scale = cover / Math.min(img.width, img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  // pan: shift UV only (good for seamless fire textures)
  // jitter: mild pan + rotation (ground, water, etc.)
  let ang = 0, ox = 0, oy = 0;
  if (pan) {
    ox = (hash - 0.5) * hexSize * 0.55;
    oy = (((hash * 7) % 1) - 0.5) * hexSize * 0.55;
  } else if (jitter) {
    ang = (hash - 0.5) * 0.1;
    ox = (hash - 0.5) * hexSize * 0.08;
    oy = (((hash * 7) % 1) - 0.5) * hexSize * 0.08;
  }
  ctx.translate(x + ox, y + oy);
  ctx.rotate(ang);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const inventoryEl = document.getElementById("inventory");

const TILE = 32;
const WORLD_W = 200;
const WORLD_H = 80;
const VIEW_W = Math.floor(canvas.width / TILE);
const VIEW_H = Math.floor(canvas.height / TILE);
const GRAVITY = 0.45;

const BLOCKS = {
  air: { id: 0, name: "Air", color: "transparent", solid: false, collect: false },
  grass: { id: 1, name: "Grass", color: "#4caf50", solid: true, collect: true },
  dirt: { id: 2, name: "Dirt", color: "#8d5a2e", solid: true, collect: true },
  stone: { id: 3, name: "Stone", color: "#8d8f98", solid: true, collect: true },
  wood: { id: 4, name: "Wood", color: "#8f6030", solid: true, collect: true },
  leaves: { id: 5, name: "Leaves", color: "#2e8b57", solid: true, collect: true },
};

const ORDERED_BLOCKS = [BLOCKS.grass, BLOCKS.dirt, BLOCKS.stone, BLOCKS.wood, BLOCKS.leaves];
const BLOCK_BY_ID = new Map(Object.values(BLOCKS).map((block) => [block.id, block]));

const world = buildWorld();

const player = {
  x: 10,
  y: 10,
  w: 0.8,
  h: 1.8,
  vx: 0,
  vy: 0,
  speed: 0.12,
  jump: -9,
  onGround: false,
};

const keys = new Set();
const inventory = new Map(ORDERED_BLOCKS.map((b) => [b.id, 0]));
inventory.set(BLOCKS.dirt.id, 20);
let selectedSlot = 0;

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("mousedown", onMouseDown);

requestAnimationFrame(loop);

function buildWorld() {
  const map = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(BLOCKS.air.id));

  for (let x = 0; x < WORLD_W; x += 1) {
    const base = 34 + Math.floor(Math.sin(x / 8) * 3 + Math.sin(x / 15) * 2);
    for (let y = base; y < WORLD_H; y += 1) {
      if (y === base) map[y][x] = BLOCKS.grass.id;
      else if (y < base + 4) map[y][x] = BLOCKS.dirt.id;
      else map[y][x] = BLOCKS.stone.id;
    }

    if (Math.random() < 0.08 && x > 4 && x < WORLD_W - 4) {
      placeTree(map, x, base - 1);
    }
  }

  return map;
}

function placeTree(map, x, y) {
  for (let trunk = 0; trunk < 4; trunk += 1) {
    if (inBounds(x, y - trunk)) map[y - trunk][x] = BLOCKS.wood.id;
  }

  for (let lx = -2; lx <= 2; lx += 1) {
    for (let ly = -6; ly <= -3; ly += 1) {
      if (!inBounds(x + lx, y + ly)) continue;
      if (Math.abs(lx) + Math.abs(ly + 4) <= 3) {
        map[y + ly][x + lx] = BLOCKS.leaves.id;
      }
    }
  }
}

function loop() {
  updatePlayer();
  render();
  requestAnimationFrame(loop);
}

function updatePlayer() {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");

  if (left === right) player.vx *= 0.8;
  else if (left) player.vx = -player.speed;
  else if (right) player.vx = player.speed;

  if ((keys.has("w") || keys.has("arrowup") || keys.has(" ")) && player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }

  player.vy += GRAVITY;

  moveX(player.vx);
  moveY(player.vy / TILE);

  if (player.y > WORLD_H + 6) {
    player.x = 10;
    player.y = 8;
    player.vx = 0;
    player.vy = 0;
  }
}

function moveX(dx) {
  player.x += dx;

  if (isSolidRect(player.x, player.y, player.w, player.h)) {
    player.x -= dx;
    player.vx = 0;
  }
}

function moveY(dy) {
  player.y += dy;

  if (isSolidRect(player.x, player.y, player.w, player.h)) {
    player.y -= dy;
    if (dy > 0) player.onGround = true;
    player.vy = 0;
  } else {
    player.onGround = false;
  }
}

function isSolidRect(x, y, w, h) {
  const minX = Math.floor(x);
  const maxX = Math.floor(x + w - 0.001);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + h - 0.001);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (!inBounds(tx, ty)) continue;
      const block = blockById(world[ty][tx]);
      if (block.solid) return true;
    }
  }

  return false;
}

function render() {
  const camX = clamp(Math.floor(player.x - VIEW_W / 2), 0, WORLD_W - VIEW_W);
  const camY = clamp(Math.floor(player.y - VIEW_H / 2), 0, WORLD_H - VIEW_H);

  drawSky(camY);
  drawWorld(camX, camY);
  drawPlayer(camX, camY);
  drawCrosshair(camX, camY);
  drawInventory();
}

function drawSky(camY) {
  const skyLight = clamp(1 - camY / WORLD_H, 0.35, 1);
  const top = `rgba(${Math.floor(80 * skyLight)}, ${Math.floor(170 * skyLight)}, ${Math.floor(255 * skyLight)}, 1)`;
  const bottom = `rgba(${Math.floor(20 * skyLight)}, ${Math.floor(100 * skyLight)}, ${Math.floor(170 * skyLight)}, 1)`;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawWorld(camX, camY) {
  for (let sy = 0; sy < VIEW_H; sy += 1) {
    for (let sx = 0; sx < VIEW_W; sx += 1) {
      const wx = camX + sx;
      const wy = camY + sy;
      if (!inBounds(wx, wy)) continue;

      const block = blockById(world[wy][wx]);
      if (block.id === BLOCKS.air.id) continue;

      ctx.fillStyle = block.color;
      ctx.fillRect(sx * TILE, sy * TILE, TILE, TILE);
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.strokeRect(sx * TILE, sy * TILE, TILE, TILE);
    }
  }
}

function drawPlayer(camX, camY) {
  const px = (player.x - camX) * TILE;
  const py = (player.y - camY) * TILE;

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(px, py, player.w * TILE, player.h * TILE);

  ctx.fillStyle = "#2f2f2f";
  ctx.fillRect(px + 7, py + 12, 4, 4);
  ctx.fillRect(px + 15, py + 12, 4, 4);
}

function drawCrosshair(camX, camY) {
  const mx = Math.floor(player.x + 1.2);
  const my = Math.floor(player.y + 0.9);
  if (!inBounds(mx, my)) return;

  const sx = (mx - camX) * TILE;
  const sy = (my - camY) * TILE;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
}

function onMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const camX = clamp(Math.floor(player.x - VIEW_W / 2), 0, WORLD_W - VIEW_W);
  const camY = clamp(Math.floor(player.y - VIEW_H / 2), 0, WORLD_H - VIEW_H);

  const wx = Math.floor(clickX / TILE) + camX;
  const wy = Math.floor(clickY / TILE) + camY;

  if (!inBounds(wx, wy)) return;

  if (distance(player.x + player.w / 2, player.y + player.h / 2, wx + 0.5, wy + 0.5) > 5) {
    return;
  }

  if (e.button === 0) breakBlock(wx, wy);
  if (e.button === 2) placeBlock(wx, wy);
}

function breakBlock(x, y) {
  const current = world[y][x];
  if (current === BLOCKS.air.id) return;

  world[y][x] = BLOCKS.air.id;
  const block = blockById(current);
  if (block.collect) {
    inventory.set(block.id, (inventory.get(block.id) || 0) + 1);
  }
}

function placeBlock(x, y) {
  if (world[y][x] !== BLOCKS.air.id) return;

  const selected = ORDERED_BLOCKS[selectedSlot];
  const count = inventory.get(selected.id) || 0;
  if (count <= 0) return;

  world[y][x] = selected.id;

  if (isSolidRect(player.x, player.y, player.w, player.h)) {
    world[y][x] = BLOCKS.air.id;
    return;
  }

  inventory.set(selected.id, count - 1);
}

function drawInventory() {
  const slots = ORDERED_BLOCKS.map((block, i) => {
    const amount = inventory.get(block.id) || 0;
    return `<div class="slot ${i === selectedSlot ? "active" : ""}"><strong>${i + 1}. ${block.name}</strong><br>${amount}</div>`;
  });

  inventoryEl.innerHTML = slots.join("");
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  keys.add(key);

  if (key >= "1" && key <= String(ORDERED_BLOCKS.length)) {
    selectedSlot = Number(key) - 1;
  }
}

function inBounds(x, y) {
  return y >= 0 && y < WORLD_H && x >= 0 && x < WORLD_W;
}

function blockById(id) {
  return Object.values(BLOCKS).find((b) => b.id === id) || BLOCKS.air;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

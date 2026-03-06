const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v3";

const cars = [
  { id: "starter", name: "Starter", price: 0, color: "#3fc1ff", speed: 6.0, control: 4.2, reward: 1 },
  { id: "city", name: "City GT", price: 500, color: "#62ff93", speed: 6.7, control: 4.7, reward: 1.05 },
  { id: "street", name: "Street Pro", price: 1400, color: "#ffe16f", speed: 7.4, control: 5.2, reward: 1.1 },
  { id: "turbo", name: "Turbo XR", price: 3200, color: "#ff9f63", speed: 8.2, control: 5.7, reward: 1.16 },
  { id: "rally", name: "Rally V8", price: 6800, color: "#ff6f91", speed: 9.0, control: 6.0, reward: 1.24 },
  { id: "hyper", name: "Hyper ZX", price: 12000, color: "#9f83ff", speed: 9.8, control: 6.4, reward: 1.35 },
  { id: "legend", name: "Legend One", price: 20000, color: "#ffffff", speed: 10.8, control: 6.9, reward: 1.5 },
];

const surprises = [
  // 4 buenas inventadas + cohete
  { name: "🚀 Cohete", desc: "+15m instantáneos", type: "good", apply: () => { state.distance += 15; } },
  { name: "💰 Bolsa", desc: "+$220", type: "good", apply: () => { state.money += 220; } },
  { name: "🛡️ Escudo", desc: "Ignora 1 choque", type: "good", apply: () => { state.shield += 1; } },
  { name: "🧲 Imán", desc: "Más dinero 7s", type: "good", apply: () => { state.moneyBoostUntil = performance.now() + 7000; } },
  { name: "🛠️ Asfalto limpio", desc: "Quita obstáculos de pista", type: "good", apply: () => { state.trackHazards = []; } },
  // 3 malas
  { name: "🕳️ Bache", desc: "-8m", type: "bad", apply: () => { state.distance = Math.max(0, state.distance - 8); } },
  { name: "💸 Multa", desc: "-$180", type: "bad", apply: () => { state.money = Math.max(0, state.money - 180); } },
  { name: "🛢️ Derrape", desc: "Control reducido 5s", type: "bad", apply: () => { state.slipUntil = performance.now() + 5000; } },
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("level"),
  money: document.getElementById("money"),
  carName: document.getElementById("carName"),
  speed: document.getElementById("speed"),
  nitro: document.getElementById("nitro"),
  target: document.getElementById("target"),
  distance: document.getElementById("distance"),
  message: document.getElementById("message"),
  startBtn: document.getElementById("startBtn"),
  nextBtn: document.getElementById("nextBtn"),
  shopList: document.getElementById("shopList"),
  effectTitle: document.getElementById("effectTitle"),
  effectDesc: document.getElementById("effectDesc"),
};

const state = {
  level: 1,
  money: 0,
  selectedCar: "starter",
  ownedCars: ["starter"],
  running: false,
  wonLevel: false,
  distance: 0,
  targetDistance: 800,
  roadOffset: 0,
  traffic: [],
  trackHazards: [],
  itemBoxes: [],
  nitroPacks: [],
  lastTrafficSpawn: 0,
  lastHazardSpawn: 0,
  lastBoxSpawn: 0,
  lastNitroSpawn: 0,
  player: { x: canvas.width / 2, y: canvas.height - 100, width: 36, height: 66, vx: 0 },
  speedKmh: 0,
  nitroActiveUntil: 0,
  shield: 0,
  slipUntil: 0,
  moneyBoostUntil: 0,
  keys: { left: false, right: false },
  lastTime: 0,
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rectCenter(obj) { return { x: obj.x - obj.w / 2, y: obj.y - obj.h / 2, w: obj.w, h: obj.h }; }
function rectPlayer() { return { x: state.player.x - state.player.width / 2, y: state.player.y - state.player.height / 2, w: state.player.width, h: state.player.height }; }
function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function setEffectBox(title, desc) {
  ui.effectTitle.textContent = title;
  ui.effectDesc.textContent = desc;
}

function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.level = clamp(Number(data.level || 1), 1, TOTAL_LEVELS);
    state.money = Math.max(0, Number(data.money || 0));
    if (Array.isArray(data.ownedCars)) {
      state.ownedCars = data.ownedCars.filter((id) => cars.some((c) => c.id === id));
      if (!state.ownedCars.includes("starter")) state.ownedCars.unshift("starter");
    }
    if (cars.some((c) => c.id === data.selectedCar) && state.ownedCars.includes(data.selectedCar)) {
      state.selectedCar = data.selectedCar;
    }
  } catch {
    // ignore
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    level: state.level,
    money: state.money,
    selectedCar: state.selectedCar,
    ownedCars: state.ownedCars,
  }));
}

function currentCar() { return cars.find((c) => c.id === state.selectedCar) || cars[0]; }

function levelConfig(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1);
  return {
    trafficSpeed: 2.3 + t * 7.8,
    targetDistance: Math.round(900 + t * 5500),
    trafficEvery: 900 - t * 560,
    hazardEvery: 1800 - t * 900,
    boxEvery: 4200 - t * 1800,
    nitroEvery: 6000 - t * 2500,
    reward: Math.round((125 + level * 19) * (1 + t * 1.9)),
    nearMissReward: Math.round(20 + t * 60),
    passReward: Math.round(8 + t * 7),
    trafficCap: Math.round(4 + t * 11),
  };
}

function resetLevel() {
  const cfg = levelConfig(state.level);
  state.distance = 0;
  state.targetDistance = cfg.targetDistance;
  state.roadOffset = 0;
  state.traffic = [];
  state.trackHazards = [];
  state.itemBoxes = [];
  state.nitroPacks = [];
  state.lastTrafficSpawn = 0;
  state.lastHazardSpawn = 0;
  state.lastBoxSpawn = 0;
  state.lastNitroSpawn = 0;
  state.wonLevel = false;
  state.player.x = canvas.width / 2;
  state.player.vx = 0;
  state.speedKmh = 0;
  state.nitroActiveUntil = 0;
  state.shield = 0;
  state.slipUntil = 0;
  state.moneyBoostUntil = 0;
  ui.nextBtn.disabled = true;
  ui.message.textContent = `Nivel ${state.level}: evita tráfico, obstáculos y usa cajas sorpresa.`;
  setEffectBox("Sin sorpresa", "Rompe una caja para recibir efecto.");
  updateHUD();
}

function updateHUD() {
  const now = performance.now();
  const nitroLeft = Math.max(0, state.nitroActiveUntil - now);
  ui.level.textContent = String(state.level);
  ui.money.textContent = String(Math.floor(state.money));
  ui.carName.textContent = currentCar().name;
  ui.speed.textContent = String(Math.floor(state.speedKmh));
  ui.nitro.textContent = nitroLeft > 0 ? `${(nitroLeft / 1000).toFixed(1)}s` : "No";
  ui.target.textContent = String(state.targetDistance);
  ui.distance.textContent = String(Math.floor(state.distance));
}

function renderShop() {
  ui.shopList.innerHTML = "";
  cars.forEach((car) => {
    const owned = state.ownedCars.includes(car.id);
    const selected = state.selectedCar === car.id;

    const card = document.createElement("div");
    card.className = "car-card";
    card.innerHTML = `
      <p><strong>${car.name}</strong> - $${car.price}</p>
      <p>Velocidad: ${car.speed.toFixed(1)} | Control: ${car.control.toFixed(1)} | Bonus dinero: x${car.reward.toFixed(2)}</p>
      <div class="preview-row">
        <span class="color-chip" style="background:${car.color}" title="Color ${car.name}"></span>
        <span class="mini-car" style="background:${car.color}"></span>
        <small>Color real del coche</small>
      </div>
      <span class="tag ${owned ? "ok" : "warn"}">${owned ? "Comprado" : "No comprado"}</span>
      <div class="actions"></div>
    `;

    const actions = card.querySelector(".actions");
    const buyBtn = document.createElement("button");
    buyBtn.textContent = owned ? "Comprado" : `Comprar ($${car.price})`;
    buyBtn.disabled = owned || state.money < car.price;
    buyBtn.onclick = () => {
      if (owned || state.money < car.price) return;
      state.money -= car.price;
      state.ownedCars.push(car.id);
      ui.message.textContent = `Compraste ${car.name}.`;
      save();
      renderShop();
      updateHUD();
    };

    const selectBtn = document.createElement("button");
    selectBtn.textContent = selected ? "En uso" : "Usar";
    selectBtn.disabled = !owned || selected;
    selectBtn.onclick = () => {
      if (!owned) return;
      state.selectedCar = car.id;
      ui.message.textContent = `Ahora conduces ${car.name}.`;
      save();
      renderShop();
      updateHUD();
    };

    actions.append(buyBtn, selectBtn);
    ui.shopList.append(card);
  });
}

function roadSpawnX() {
  const laneWidth = 70;
  const lane = Math.floor(Math.random() * 4) - 1.5;
  return canvas.width / 2 + lane * laneWidth + (Math.random() * 16 - 8);
}

function spawnEntities(now) {
  const cfg = levelConfig(state.level);

  if (now - state.lastTrafficSpawn > cfg.trafficEvery && state.traffic.length < cfg.trafficCap) {
    state.lastTrafficSpawn = now;
    state.traffic.push({ x: roadSpawnX(), y: -90, w: 36, h: 66, color: `hsl(${Math.random() * 360} 75% 60%)`, nearAwarded: false });
  }

  if (now - state.lastHazardSpawn > cfg.hazardEvery) {
    state.lastHazardSpawn = now;
    state.trackHazards.push({ x: roadSpawnX(), y: -70, w: 30, h: 30, kind: Math.random() > 0.5 ? "cone" : "oil" });
  }

  if (now - state.lastBoxSpawn > cfg.boxEvery) {
    state.lastBoxSpawn = now;
    state.itemBoxes.push({ x: roadSpawnX(), y: -80, w: 34, h: 34 });
  }

  if (now - state.lastNitroSpawn > cfg.nitroEvery) {
    state.lastNitroSpawn = now;
    state.nitroPacks.push({ x: roadSpawnX(), y: -80, w: 30, h: 44 });
  }
}

function activateRandomSurprise() {
  const picked = surprises[Math.floor(Math.random() * surprises.length)];
  picked.apply();
  setEffectBox(picked.name, picked.desc);
  ui.message.textContent = `Sorpresa: ${picked.name} (${picked.desc})`;
}

function hitOrShield(reason) {
  if (state.shield > 0) {
    state.shield -= 1;
    ui.message.textContent = `🛡️ Escudo te salvó de ${reason}`;
    return false;
  }
  state.running = false;
  state.nitroActiveUntil = 0;
  ui.message.textContent = `💥 Choque en nivel ${state.level}. Pulsa Empezar/Reintentar.`;
  return true;
}

function winLevel() {
  state.running = false;
  state.nitroActiveUntil = 0;
  state.wonLevel = true;
  const cfg = levelConfig(state.level);
  const bonus = Math.round(cfg.reward * currentCar().reward);
  state.money += bonus;
  ui.message.textContent = `🏁 Nivel superado. Premio: $${bonus}.`;
  ui.nextBtn.disabled = state.level >= TOTAL_LEVELS;
  save();
  renderShop();
  updateHUD();
}

function update(dt, now) {
  if (!state.running) return;

  const car = currentCar();
  const cfg = levelConfig(state.level);
  const nitroActive = now < state.nitroActiveUntil;
  const nitroFactor = nitroActive ? 1.65 : 1;
  const slipFactor = now < state.slipUntil ? 0.6 : 1;
  const moneyFactor = now < state.moneyBoostUntil ? 1.5 : 1;

  const steer = (state.keys.left ? -1 : 0) + (state.keys.right ? 1 : 0);
  state.player.vx += steer * car.control * slipFactor * dt * 9.6;
  state.player.vx *= 0.86;
  state.player.x += state.player.vx;
  state.player.x = clamp(state.player.x, 86, canvas.width - 86);

  state.speedKmh = (cfg.trafficSpeed + car.speed * 0.4 * nitroFactor) * 23;
  state.roadOffset = (state.roadOffset + (cfg.trafficSpeed + car.speed * 0.3 * nitroFactor) * 170 * dt) % 92;

  spawnEntities(now);
  const pRect = rectPlayer();

  for (const t of state.traffic) {
    t.y += (cfg.trafficSpeed + car.speed * 0.22 + (nitroActive ? 1.1 : 0)) * 112 * dt;
    const tRect = rectCenter(t);

    if (intersects(pRect, tRect)) {
      if (hitOrShield("tráfico")) return;
    }

    const verticalClose = Math.abs(state.player.y - t.y) < 58;
    const hGap = Math.abs(state.player.x - t.x) - (state.player.width + t.w) / 2;
    const nearMiss = verticalClose && hGap > 0 && hGap < 10;
    if (nearMiss && !t.nearAwarded) {
      t.nearAwarded = true;
      const bonus = Math.round(cfg.nearMissReward * car.reward * moneyFactor);
      state.money += bonus;
      ui.message.textContent = `🔥 Casi choque +$${bonus}`;
    }
  }

  for (const h of state.trackHazards) {
    h.y += (cfg.trafficSpeed + car.speed * 0.26) * 110 * dt;
    if (intersects(pRect, rectCenter(h))) {
      if (h.kind === "oil") {
        state.slipUntil = now + 4500;
        ui.message.textContent = "🛢️ Pisaste aceite: menos control";
      } else if (hitOrShield("obstáculo")) {
        return;
      }
      h.y = canvas.height + 200;
    }
  }

  for (const b of state.itemBoxes) {
    b.y += (cfg.trafficSpeed + car.speed * 0.23) * 112 * dt;
    if (intersects(pRect, rectCenter(b))) {
      activateRandomSurprise();
      b.y = canvas.height + 200;
    }
  }

  for (const n of state.nitroPacks) {
    n.y += (cfg.trafficSpeed + car.speed * 0.24) * 112 * dt;
    if (intersects(pRect, rectCenter(n))) {
      state.nitroActiveUntil = now + 5000;
      ui.message.textContent = "⚡ Nitro recogido (5s)";
      n.y = canvas.height + 200;
    }
  }

  const before = state.traffic.length;
  state.traffic = state.traffic.filter((o) => o.y < canvas.height + 110);
  state.trackHazards = state.trackHazards.filter((o) => o.y < canvas.height + 110);
  state.itemBoxes = state.itemBoxes.filter((o) => o.y < canvas.height + 110);
  state.nitroPacks = state.nitroPacks.filter((o) => o.y < canvas.height + 110);

  const passed = before - state.traffic.length;
  if (passed > 0) {
    state.money += passed * Math.round(cfg.passReward * car.reward * moneyFactor);
  }

  state.distance += (car.speed * 8.2 + cfg.trafficSpeed * 6.6) * nitroFactor * dt;
  if (state.distance >= state.targetDistance) winLevel();

  updateHUD();
}

function drawRoad() {
  ctx.fillStyle = "#1f2d31";
  ctx.fillRect(58, 0, 304, canvas.height);

  ctx.fillStyle = "#697079";
  ctx.fillRect(54, 0, 4, canvas.height);
  ctx.fillRect(362, 0, 4, canvas.height);

  ctx.fillStyle = "#e3e8ff";
  for (let y = -92 + state.roadOffset; y < canvas.height; y += 92) {
    ctx.fillRect(canvas.width / 2 - 3, y, 6, 48);
  }
}

function drawCar(x, y, w, h, color, nitro = false) {
  if (nitro) {
    ctx.fillStyle = "rgb(91 204 255 / 70%)";
    ctx.beginPath();
    ctx.ellipse(x, y + h / 2 + 9, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "#0d111d";
  ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, 15);
  ctx.fillRect(x - w / 2 + 6, y + h / 2 - 21, w - 12, 15);
}

function drawHazard(h) {
  if (h.kind === "cone") {
    ctx.fillStyle = "#ff8a33";
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 14);
    ctx.lineTo(h.x - 12, h.y + 14);
    ctx.lineTo(h.x + 12, h.y + 14);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#1b1b1b";
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBox(b) {
  ctx.fillStyle = "#f8d749";
  ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("?", b.x, b.y + 6);
}

function drawNitroPack(n) {
  ctx.fillStyle = "#58dcff";
  ctx.fillRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
  ctx.fillStyle = "#10263b";
  ctx.fillRect(n.x - 6, n.y - 14, 12, 28);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  for (const t of state.traffic) drawCar(t.x, t.y, t.w, t.h, t.color);
  for (const h of state.trackHazards) drawHazard(h);
  for (const b of state.itemBoxes) drawBox(b);
  for (const n of state.nitroPacks) drawNitroPack(n);

  drawCar(state.player.x, state.player.y, state.player.width, state.player.height, currentCar().color, performance.now() < state.nitroActiveUntil);

  if (!state.running) {
    ctx.fillStyle = "rgb(0 0 0 / 45%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.wonLevel ? "Nivel superado" : "Pulsa Empezar", canvas.width / 2, canvas.height / 2);
  }
}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;
  update(dt, ts);
  draw();
  requestAnimationFrame(frame);
}

ui.startBtn.onclick = () => { resetLevel(); state.running = true; };
ui.nextBtn.onclick = () => {
  if (!state.wonLevel) return;
  if (state.level < TOTAL_LEVELS) {
    state.level += 1;
    save();
    resetLevel();
    state.running = true;
  }
};

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "arrowleft" || key === "a") state.keys.left = true;
  if (key === "arrowright" || key === "d") state.keys.right = true;
});
window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (key === "arrowleft" || key === "a") state.keys.left = false;
  if (key === "arrowright" || key === "d") state.keys.right = false;
});

loadSave();
resetLevel();
renderShop();
requestAnimationFrame(frame);

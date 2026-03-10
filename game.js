const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v7";

const TOURNAMENT_STAGES = [
  { name: "16avos", difficulty: 1.0, target: 1300, reward: 350 },
  { name: "8avos", difficulty: 1.12, target: 1600, reward: 450 },
  { name: "4tos", difficulty: 1.25, target: 1900, reward: 600 },
  { name: "Semis", difficulty: 1.4, target: 2200, reward: 850 },
  { name: "Final", difficulty: 1.6, target: 2600, reward: 1200 },
];

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
  { name: "🚀 Cohete", desc: "+15m", apply: () => { state.distance += 15; } },
  { name: "💰 Bolsa", desc: "+$220", apply: () => { state.money += 220; } },
  { name: "🛡️ Escudo", desc: "Ignora 1 choque", apply: () => { state.shield += 1; } },
  { name: "🧲 Imán", desc: "+dinero 7s", apply: () => { state.moneyBoostUntil = performance.now() + 7000; } },
  { name: "🛠️ Limpieza", desc: "Quita obstáculos", apply: () => { state.hazards = []; } },
  { name: "🕳️ Bache", desc: "-8m", apply: () => { state.distance = Math.max(0, state.distance - 8); } },
  { name: "💸 Multa", desc: "-$180", apply: () => { state.money = Math.max(0, state.money - 180); } },
  { name: "🛢️ Derrape", desc: "Control bajo 5s", apply: () => { state.slipUntil = performance.now() + 5000; } },
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  modeSelect: document.getElementById("modeSelect"),
  level: document.getElementById("level"), money: document.getElementById("money"), carName: document.getElementById("carName"),
  speed: document.getElementById("speed"), nitro: document.getElementById("nitro"), target: document.getElementById("target"),
  distance: document.getElementById("distance"), message: document.getElementById("message"), startBtn: document.getElementById("startBtn"),
  nextBtn: document.getElementById("nextBtn"), shopList: document.getElementById("shopList"), effectTitle: document.getElementById("effectTitle"),
  effectDesc: document.getElementById("effectDesc"), tournamentRound: document.getElementById("tournamentRound"),
  tournamentInfo: document.getElementById("tournamentInfo"),
};

const state = {
  mode: "arcade", level: 1, money: 0, selectedCar: "starter", ownedCars: ["starter"],
  keys: { left: false, right: false, a: false, d: false },
  running: false, won: false, lastTime: 0,
  tournamentStage: 0,
  target: 1000, distance: 0, speedKmh: 0,
  nitroUntil: 0, shield: 0, slipUntil: 0, moneyBoostUntil: 0,
  roadOffset: 0, traffic: [], hazards: [], boxes: [], nitros: [],
  lastTraffic: 0, lastHazard: 0, lastBox: 0, lastNitro: 0,
  player: { x: canvas.width / 2, y: canvas.height - 100, w: 36, h: 66, vx: 0 },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rect = (x, y, w, h) => ({ x: x - w / 2, y: y - h / 2, w, h });
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const currentCar = () => cars.find((c) => c.id === state.selectedCar) || cars[0];

function levelConfig(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1);
  return {
    trafficSpeed: 2.3 + t * 7.8,
    targetDistance: Math.round(900 + t * 5500),
    trafficEvery: 900 - t * 560,
    hazardEvery: 1800 - t * 900,
    boxEvery: 4200 - t * 1800,
    nitroEvery: 6200 - t * 2500,
    reward: Math.round((125 + level * 19) * (1 + t * 1.9)),
    nearMissReward: Math.round(20 + t * 60),
    passReward: Math.round(8 + t * 7),
    trafficCap: Math.round(4 + t * 11),
  };
}

function modeDifficulty() {
  if (state.mode === "tournament") return TOURNAMENT_STAGES[state.tournamentStage].difficulty;
  if (state.mode === "pvp") return 1.08;
  return 1;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: state.level, money: state.money, selectedCar: state.selectedCar, ownedCars: state.ownedCars }));
}

function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    state.level = clamp(Number(d.level || 1), 1, TOTAL_LEVELS);
    state.money = Math.max(0, Number(d.money || 0));
    if (Array.isArray(d.ownedCars)) {
      state.ownedCars = d.ownedCars.filter((id) => cars.some((c) => c.id === id));
      if (!state.ownedCars.includes("starter")) state.ownedCars.unshift("starter");
    }
    if (cars.some((c) => c.id === d.selectedCar) && state.ownedCars.includes(d.selectedCar)) state.selectedCar = d.selectedCar;
  } catch {}
}

function setEffect(title, desc) {
  ui.effectTitle.textContent = title;
  ui.effectDesc.textContent = desc;
}

function resetRun() {
  state.distance = 0;
  state.speedKmh = 0;
  state.nitroUntil = 0;
  state.shield = 0;
  state.slipUntil = 0;
  state.moneyBoostUntil = 0;
  state.roadOffset = 0;
  state.traffic = [];
  state.hazards = [];
  state.boxes = [];
  state.nitros = [];
  state.lastTraffic = 0;
  state.lastHazard = 0;
  state.lastBox = 0;
  state.lastNitro = 0;
  state.player.x = canvas.width / 2;
  state.player.vx = 0;
  state.won = false;
  ui.nextBtn.disabled = true;
  setEffect("Sin sorpresa", "Rompe una caja para recibir efecto.");
}

function setupMode() {
  if (state.mode === "arcade") {
    state.target = levelConfig(state.level).targetDistance;
    ui.tournamentRound.textContent = "Arcade";
    ui.tournamentInfo.textContent = `Nivel ${state.level}/167`;
  } else if (state.mode === "tournament") {
    const st = TOURNAMENT_STAGES[state.tournamentStage];
    state.target = st.target;
    ui.tournamentRound.textContent = st.name;
    ui.tournamentInfo.textContent = `Objetivo: ${st.target}m | Dif: ${st.difficulty.toFixed(2)}`;
  } else {
    state.target = 1800;
    ui.tournamentRound.textContent = "PvP estilo arcade";
    ui.tournamentInfo.textContent = "Mismo estilo arcade + mini mapa";
  }
}

function roadSpawnX() {
  const lane = Math.floor(Math.random() * 4) - 1.5;
  return canvas.width / 2 + lane * 70 + (Math.random() * 16 - 8);
}

function spawnEntities(now) {
  const cfg = levelConfig(state.level);
  const m = modeDifficulty();
  if (now - state.lastTraffic > cfg.trafficEvery / m && state.traffic.length < Math.round(cfg.trafficCap * m)) {
    state.lastTraffic = now;
    state.traffic.push({ x: roadSpawnX(), y: -90, w: 36, h: 66, near: false });
  }
  if (now - state.lastHazard > cfg.hazardEvery / m) {
    state.lastHazard = now;
    state.hazards.push({ x: roadSpawnX(), y: -70, w: 30, h: 30, kind: Math.random() > 0.5 ? "cone" : "oil" });
  }
  if (now - state.lastBox > cfg.boxEvery) {
    state.lastBox = now;
    state.boxes.push({ x: roadSpawnX(), y: -80, w: 34, h: 34 });
  }
  if (now - state.lastNitro > cfg.nitroEvery) {
    state.lastNitro = now;
    state.nitros.push({ x: roadSpawnX(), y: -80, w: 30, h: 44 });
  }
}

function loseRun(msg = "💥 Choque") {
  if (state.shield > 0) {
    state.shield -= 1;
    ui.message.textContent = "🛡️ Escudo te salvó";
    return false;
  }
  state.running = false;
  ui.message.textContent = `${msg}. Reintenta.`;
  return true;
}

function winRun() {
  state.running = false;
  state.won = true;

  if (state.mode === "arcade") {
    const gain = Math.round(levelConfig(state.level).reward * currentCar().reward);
    state.money += gain;
    ui.nextBtn.disabled = state.level >= TOTAL_LEVELS;
    ui.message.textContent = `🏁 Nivel superado +$${gain}`;
  } else if (state.mode === "tournament") {
    const st = TOURNAMENT_STAGES[state.tournamentStage];
    state.money += st.reward;
    ui.nextBtn.disabled = !(state.tournamentStage < TOURNAMENT_STAGES.length - 1);
    ui.message.textContent = `🏆 ${st.name} superado +$${st.reward}`;
  } else {
    state.money += 300;
    ui.message.textContent = "🏁 PvP estilo arcade completado +$300";
  }

  save();
  renderShop();
}

function updateRun(dt, now) {
  const car = currentCar();
  const cfg = levelConfig(state.level);
  const m = modeDifficulty();
  const nitroActive = now < state.nitroUntil;
  const nitroFactor = nitroActive ? 1.65 : 1;
  const slipFactor = now < state.slipUntil ? 0.6 : 1;
  const moneyFactor = now < state.moneyBoostUntil ? 1.5 : 1;

  const left = state.keys.left || state.keys.a;
  const right = state.keys.right || state.keys.d;
  const steer = (left ? -1 : 0) + (right ? 1 : 0);

  state.player.vx += steer * car.control * slipFactor * dt * 9.6;
  state.player.vx *= 0.86;
  state.player.x = clamp(state.player.x + state.player.vx, 86, canvas.width - 86);

  state.speedKmh = (cfg.trafficSpeed + car.speed * 0.4 * nitroFactor * m) * 23;
  state.roadOffset = (state.roadOffset + (cfg.trafficSpeed + car.speed * 0.3 * nitroFactor * m) * 170 * dt) % 92;

  spawnEntities(now);
  const pRect = rect(state.player.x, state.player.y, state.player.w, state.player.h);

  for (const t of state.traffic) {
    t.y += (cfg.trafficSpeed * m + car.speed * 0.22 + (nitroActive ? 1.1 : 0)) * 112 * dt;
    if (intersects(pRect, rect(t.x, t.y, t.w, t.h)) && loseRun()) return;
    const gap = Math.abs(state.player.x - t.x) - (state.player.w + t.w) / 2;
    const near = Math.abs(state.player.y - t.y) < 58 && gap > 0 && gap < 10;
    if (near && !t.near) {
      t.near = true;
      state.money += Math.round(cfg.nearMissReward * car.reward * moneyFactor);
    }
  }

  for (const h of state.hazards) {
    h.y += (cfg.trafficSpeed * m + car.speed * 0.26) * 110 * dt;
    if (!intersects(pRect, rect(h.x, h.y, h.w, h.h))) continue;
    if (h.kind === "oil") {
      state.slipUntil = now + 4500;
      ui.message.textContent = "🛢️ Derrape";
    } else if (loseRun("💥 Obstáculo")) return;
    h.y = canvas.height + 200;
  }

  for (const b of state.boxes) {
    b.y += (cfg.trafficSpeed * m + car.speed * 0.23) * 112 * dt;
    if (!intersects(pRect, rect(b.x, b.y, b.w, b.h))) continue;
    const s = surprises[Math.floor(Math.random() * surprises.length)];
    s.apply();
    setEffect(s.name, s.desc);
    b.y = canvas.height + 200;
  }

  for (const n of state.nitros) {
    n.y += (cfg.trafficSpeed * m + car.speed * 0.24) * 112 * dt;
    if (!intersects(pRect, rect(n.x, n.y, n.w, n.h))) continue;
    state.nitroUntil = now + 5000;
    ui.message.textContent = "⚡ Nitro 5s";
    n.y = canvas.height + 200;
  }

  const before = state.traffic.length;
  state.traffic = state.traffic.filter((x) => x.y < canvas.height + 120);
  state.hazards = state.hazards.filter((x) => x.y < canvas.height + 120);
  state.boxes = state.boxes.filter((x) => x.y < canvas.height + 120);
  state.nitros = state.nitros.filter((x) => x.y < canvas.height + 120);
  state.money += (before - state.traffic.length) * Math.round(cfg.passReward * car.reward * moneyFactor);

  state.distance += (car.speed * 8.2 + cfg.trafficSpeed * 6.6 * m) * nitroFactor * dt;
  if (state.distance >= state.target) winRun();
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
  ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, 13);
  ctx.fillRect(x - w / 2 + 6, y + h / 2 - 19, w - 12, 13);
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

function drawNitro(n) {
  ctx.fillStyle = "#58dcff";
  ctx.fillRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
  ctx.fillStyle = "#10263b";
  ctx.fillRect(n.x - 6, n.y - 14, 12, 28);
}

function drawMiniMapObjective() {
  if (state.mode === "arcade") return;
  const x = canvas.width - 118;
  const y = 12;
  const w = 104;
  const h = 104;
  const p = clamp(state.distance / state.target, 0, 1);

  ctx.fillStyle = "rgb(0 0 0 / 45%)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#9bb5ff";
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = "#eef2ff";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h - 12);
  ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.2, x + w - 12, y + 12);
  ctx.stroke();

  const px = x + 10 + (w - 22) * p;
  const py = y + h - 12 - (h - 24) * p * 0.75;
  ctx.fillStyle = currentCar().color;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "10px sans-serif";
  ctx.fillText("Mini mapa", x + 8, y + 14);
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

function drawGame() {
  drawRoad();
  for (const t of state.traffic) drawCar(t.x, t.y, 36, 66, "#ff7388");
  for (const h of state.hazards) drawHazard(h);
  for (const b of state.boxes) drawBox(b);
  for (const n of state.nitros) drawNitro(n);
  drawCar(state.player.x, state.player.y, state.player.w, state.player.h, currentCar().color, performance.now() < state.nitroUntil);
  drawMiniMapObjective();
}

function updateHUD() {
  const nitro = Math.max(0, state.nitroUntil - performance.now());
  ui.level.textContent = String(state.level);
  ui.money.textContent = String(Math.floor(state.money));
  ui.carName.textContent = currentCar().name;
  ui.speed.textContent = String(Math.floor(state.speedKmh));
  ui.nitro.textContent = nitro > 0 ? `${(nitro / 1000).toFixed(1)}s` : "No";
  ui.target.textContent = String(Math.round(state.target));
  ui.distance.textContent = String(Math.floor(state.distance));
}

function renderShop() {
  ui.shopList.innerHTML = "";
  for (const car of cars) {
    const owned = state.ownedCars.includes(car.id);
    const selected = state.selectedCar === car.id;
    const card = document.createElement("div");
    card.className = "car-card";
    card.innerHTML = `<p><strong>${car.name}</strong> - $${car.price}</p>
      <p>Velocidad: ${car.speed.toFixed(1)} | Control: ${car.control.toFixed(1)} | Bonus: x${car.reward.toFixed(2)}</p>
      <div class="preview-row"><span class="color-chip" style="background:${car.color}"></span><span class="mini-car" style="background:${car.color}"></span><small>Color real</small></div>
      <span class="tag ${owned ? "ok" : "warn"}">${owned ? "Comprado" : "No comprado"}</span><div class="actions"></div>`;
    const actions = card.querySelector(".actions");
    const buy = document.createElement("button");
    buy.textContent = owned ? "Comprado" : `Comprar ($${car.price})`;
    buy.disabled = owned || state.money < car.price;
    buy.onclick = () => { if (!owned && state.money >= car.price) { state.money -= car.price; state.ownedCars.push(car.id); save(); renderShop(); updateHUD(); } };
    const use = document.createElement("button");
    use.textContent = selected ? "En uso" : "Usar";
    use.disabled = !owned || selected;
    use.onclick = () => { if (owned) { state.selectedCar = car.id; save(); renderShop(); updateHUD(); } };
    actions.append(buy, use);
    ui.shopList.append(card);
  }
}

function startCurrentMode() {
  state.mode = ui.modeSelect.value;
  resetRun();
  setupMode();
  state.running = true;

  if (state.mode === "arcade") ui.message.textContent = `Nivel ${state.level}: estilo arcade.`;
  else if (state.mode === "tournament") ui.message.textContent = `Torneo ${TOURNAMENT_STAGES[state.tournamentStage].name}: estilo arcade + mini mapa.`;
  else ui.message.textContent = "PvP estilo arcade + mini mapa.";
}

ui.startBtn.onclick = startCurrentMode;
ui.nextBtn.onclick = () => {
  if (!state.won) return;
  if (state.mode === "arcade" && state.level < TOTAL_LEVELS) {
    state.level += 1;
    save();
    startCurrentMode();
  } else if (state.mode === "tournament" && state.tournamentStage < TOURNAMENT_STAGES.length - 1) {
    state.tournamentStage += 1;
    startCurrentMode();
  }
};
ui.modeSelect.onchange = () => {
  if (ui.modeSelect.value !== "tournament") state.tournamentStage = 0;
  ui.nextBtn.disabled = true;
};

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowleft") state.keys.left = true;
  if (k === "arrowright") state.keys.right = true;
  if (k === "a") state.keys.a = true;
  if (k === "d") state.keys.d = true;
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowleft") state.keys.left = false;
  if (k === "arrowright") state.keys.right = false;
  if (k === "a") state.keys.a = false;
  if (k === "d") state.keys.d = false;
});

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;

  if (state.running) updateRun(dt, ts);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGame();

  if (!state.running) {
    ctx.fillStyle = "rgb(0 0 0 / 35%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Pulsa Empezar", canvas.width / 2, canvas.height / 2);
  }

  updateHUD();
  requestAnimationFrame(frame);
}

loadSave();
renderShop();
setupMode();
updateHUD();
requestAnimationFrame(frame);

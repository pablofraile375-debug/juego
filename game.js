const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v5";

const TOURNAMENT_STAGES = [
  { name: "16avos", rivals: 1, difficulty: 1.0 },
  { name: "8avos", rivals: 2, difficulty: 1.1 },
  { name: "4tos", rivals: 3, difficulty: 1.2 },
  { name: "Semis", rivals: 4, difficulty: 1.35 },
  { name: "Final", rivals: 5, difficulty: 1.5 },
];
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
  { name: "🚀 Cohete", desc: "+15m", apply: () => { state.arcade.distance += 15; } },
  { name: "💰 Bolsa", desc: "+$220", apply: () => { state.money += 220; } },
  { name: "🛡️ Escudo", desc: "Ignora 1 choque", apply: () => { state.arcade.shield += 1; } },
  { name: "🧲 Imán", desc: "+dinero 7s", apply: () => { state.arcade.moneyBoostUntil = performance.now() + 7000; } },
  { name: "🛠️ Limpieza", desc: "Quita obstáculos", apply: () => { state.arcade.hazards = []; } },
  { name: "🕳️ Bache", desc: "-8m", apply: () => { state.arcade.distance = Math.max(0, state.arcade.distance - 8); } },
  { name: "💸 Multa", desc: "-$180", apply: () => { state.money = Math.max(0, state.money - 180); } },
  { name: "🛢️ Derrape", desc: "Control bajo 5s", apply: () => { state.arcade.slipUntil = performance.now() + 5000; } },
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
  modeSelect: document.getElementById("modeSelect"),
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
  tournamentRound: document.getElementById("tournamentRound"),
  tournamentInfo: document.getElementById("tournamentInfo"),
};

const state = {
  mode: "arcade",
};

const state = {
  level: 1,
  money: 0,
  selectedCar: "starter",
  ownedCars: ["starter"],
  keys: { left: false, right: false, up: false, down: false, a: false, d: false, w: false, s: false },
  running: false,
  won: false,
  lastTime: 0,
  arcade: {
    target: 0,
    distance: 0,
    speedKmh: 0,
    nitroUntil: 0,
    shield: 0,
    slipUntil: 0,
    moneyBoostUntil: 0,
    roadOffset: 0,
    traffic: [],
    hazards: [],
    boxes: [],
    nitros: [],
    lastTraffic: 0,
    lastHazard: 0,
    lastBox: 0,
    lastNitro: 0,
    player: { x: canvas.width / 2, y: canvas.height - 100, w: 36, h: 66, vx: 0 },
  },
  race: {
    stageIndex: 0,
    lapsTarget: 3,
    racers: [],
    winner: null,
  },
};

function clamp(v, mn, mx) {
  return Math.max(mn, Math.min(mx, v));
}

function rect(x, y, w, h) {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function currentCar() {
  return cars.find((c) => c.id === state.selectedCar) || cars[0];
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      level: state.level,
      money: state.money,
      selectedCar: state.selectedCar,
      ownedCars: state.ownedCars,
    })
  );
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
    // ignore corrupted save
  }
}

function setEffect(title, desc) {
  ui.effectTitle.textContent = title;
  ui.effectDesc.textContent = desc;
}

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
    nitroEvery: 6200 - t * 2500,
    nitroEvery: 6000 - t * 2500,
    reward: Math.round((125 + level * 19) * (1 + t * 1.9)),
    nearMissReward: Math.round(20 + t * 60),
    passReward: Math.round(8 + t * 7),
    trafficCap: Math.round(4 + t * 11),
  };
}

function resetArcade() {
  const a = state.arcade;
  const cfg = levelConfig(state.level);

  a.target = cfg.targetDistance;
  a.distance = 0;
  a.speedKmh = 0;
  a.nitroUntil = 0;
  a.shield = 0;
  a.slipUntil = 0;
  a.moneyBoostUntil = 0;
  a.roadOffset = 0;
  a.traffic = [];
  a.hazards = [];
  a.boxes = [];
  a.nitros = [];
  a.lastTraffic = 0;
  a.lastHazard = 0;
  a.lastBox = 0;
  a.lastNitro = 0;
  a.player.x = canvas.width / 2;
  a.player.vx = 0;

  state.won = false;
  ui.nextBtn.disabled = true;
  setEffect("Sin sorpresa", "Rompe una caja para recibir efecto.");
}

function createRacer(name, color, isHuman, controls, speedBase, aiSkill = 1) {
  return {
    name,
    color,
    isHuman,
    controls,
    speedBase,
    aiSkill,
    progress: 0,
    theta: -Math.PI / 2,
    lap: 0,
    boost: 0.7,
    offset: 0,
  };
}

function resetRaceMode() {
  const car = currentCar();
  const racers = [];

  if (state.mode === "tournament") {
    const stage = TOURNAMENT_STAGES[state.race.stageIndex];
    racers.push(createRacer("Tú", car.color, true, { left: "left", right: "right", up: "up", down: "down" }, car.speed * 0.88));

    for (let i = 0; i < stage.rivals; i += 1) {
      racers.push(
        createRacer(
          `IA ${i + 1}`,
          `hsl(${(i * 65 + 20) % 360} 80% 65%)`,
          false,
          null,
          (6.8 + i * 0.5) * stage.difficulty,
          0.9 + i * 0.05
        )
      );
    }

    state.race.lapsTarget = 2 + Math.min(2, Math.floor(state.race.stageIndex / 2));
    ui.tournamentRound.textContent = stage.name;
    ui.tournamentInfo.textContent = `Rivales: ${stage.rivals} | Dificultad: ${stage.difficulty.toFixed(2)}`;
  } else {
    racers.push(createRacer("J1", car.color, true, { left: "left", right: "right", up: "up", down: "down" }, car.speed * 0.88));
    racers.push(createRacer("J2", "#ffbb55", true, { left: "a", right: "d", up: "w", down: "s" }, Math.max(6.4, car.speed * 0.85)));
    state.race.lapsTarget = 3;
    ui.tournamentRound.textContent = "PvP";
    ui.tournamentInfo.textContent = "J1: Flechas | J2: WASD";
  }

  racers.forEach((r, i) => {
    r.progress = i * -0.6;
    r.theta = (-Math.PI / 2) + r.progress;
  });

  state.race.racers = racers;
  state.race.winner = null;
  state.won = false;
  ui.nextBtn.disabled = true;
}

function roadSpawnX() {
  const lane = Math.floor(Math.random() * 4) - 1.5;
  return canvas.width / 2 + lane * 70 + (Math.random() * 16 - 8);
}

function spawnArcade(now) {
  const a = state.arcade;
  const cfg = levelConfig(state.level);

  if (now - a.lastTraffic > cfg.trafficEvery && a.traffic.length < cfg.trafficCap) {
    a.lastTraffic = now;
    a.traffic.push({ x: roadSpawnX(), y: -90, w: 36, h: 66, near: false });
  }
  if (now - a.lastHazard > cfg.hazardEvery) {
    a.lastHazard = now;
    a.hazards.push({ x: roadSpawnX(), y: -70, w: 30, h: 30, kind: Math.random() > 0.5 ? "cone" : "oil" });
  }
  if (now - a.lastBox > cfg.boxEvery) {
    a.lastBox = now;
    a.boxes.push({ x: roadSpawnX(), y: -80, w: 34, h: 34 });
  }
  if (now - a.lastNitro > cfg.nitroEvery) {
    a.lastNitro = now;
    a.nitros.push({ x: roadSpawnX(), y: -80, w: 30, h: 44 });
  }
}

function loseArcade(message = "💥 Choque") {
  if (state.arcade.shield > 0) {
    state.arcade.shield -= 1;
    ui.message.textContent = "🛡️ Escudo te salvó";
    return false;
  }

  state.running = false;
  ui.message.textContent = `${message} en nivel ${state.level}`;
  return true;
}

function winArcade() {
  state.running = false;
  state.won = true;

  const gain = Math.round(levelConfig(state.level).reward * currentCar().reward);
  state.money += gain;
  save();
  renderShop();

  ui.nextBtn.disabled = state.level >= TOTAL_LEVELS;
  ui.message.textContent = `🏁 Nivel superado +$${gain}`;
}

function updateArcade(dt, now) {
  const a = state.arcade;
  const car = currentCar();
  const cfg = levelConfig(state.level);
  const nitroActive = now < a.nitroUntil;
  const nitroFactor = nitroActive ? 1.65 : 1;
  const slipFactor = now < a.slipUntil ? 0.6 : 1;
  const moneyFactor = now < a.moneyBoostUntil ? 1.5 : 1;

  const steer = (state.keys.left ? -1 : 0) + (state.keys.right ? 1 : 0);
  a.player.vx += steer * car.control * slipFactor * dt * 9.6;
  a.player.vx *= 0.86;
  a.player.x = clamp(a.player.x + a.player.vx, 86, canvas.width - 86);

  a.speedKmh = (cfg.trafficSpeed + car.speed * 0.4 * nitroFactor) * 23;
  a.roadOffset = (a.roadOffset + (cfg.trafficSpeed + car.speed * 0.3 * nitroFactor) * 170 * dt) % 92;

  spawnArcade(now);
  const playerRect = rect(a.player.x, a.player.y, a.player.w, a.player.h);

  for (const t of a.traffic) {
    t.y += (cfg.trafficSpeed + car.speed * 0.22 + (nitroActive ? 1.1 : 0)) * 112 * dt;

    if (intersects(playerRect, rect(t.x, t.y, t.w, t.h)) && loseArcade()) return;

    const gap = Math.abs(a.player.x - t.x) - (a.player.w + t.w) / 2;
    const near = Math.abs(a.player.y - t.y) < 58 && gap > 0 && gap < 10;
    if (near && !t.near) {
      t.near = true;
      state.money += Math.round(cfg.nearMissReward * car.reward * moneyFactor);
    }
  }

  for (const h of a.hazards) {
    h.y += (cfg.trafficSpeed + car.speed * 0.26) * 110 * dt;
    if (!intersects(playerRect, rect(h.x, h.y, h.w, h.h))) continue;

    if (h.kind === "oil") {
      a.slipUntil = now + 4500;
      ui.message.textContent = "🛢️ Derrape";
    } else if (loseArcade("💥 Obstáculo")) {
      return;
    }

    h.y = canvas.height + 200;
  }

  for (const b of a.boxes) {
    b.y += (cfg.trafficSpeed + car.speed * 0.23) * 112 * dt;
    if (!intersects(playerRect, rect(b.x, b.y, b.w, b.h))) continue;

    const surprise = surprises[Math.floor(Math.random() * surprises.length)];
    surprise.apply();
    setEffect(surprise.name, surprise.desc);
    b.y = canvas.height + 200;
  }

  for (const n of a.nitros) {
    n.y += (cfg.trafficSpeed + car.speed * 0.24) * 112 * dt;
    if (!intersects(playerRect, rect(n.x, n.y, n.w, n.h))) continue;

    a.nitroUntil = now + 5000;
    ui.message.textContent = "⚡ Nitro 5s";
    n.y = canvas.height + 200;
  }

  const before = a.traffic.length;
  a.traffic = a.traffic.filter((x) => x.y < canvas.height + 120);
  a.hazards = a.hazards.filter((x) => x.y < canvas.height + 120);
  a.boxes = a.boxes.filter((x) => x.y < canvas.height + 120);
  a.nitros = a.nitros.filter((x) => x.y < canvas.height + 120);

  state.money += (before - a.traffic.length) * Math.round(cfg.passReward * car.reward * moneyFactor);

  a.distance += (car.speed * 8.2 + cfg.trafficSpeed * 6.6) * nitroFactor * dt;
  if (a.distance >= a.target) winArcade();
}

function updateRace(dt) {
  const race = state.race;

  for (const racer of race.racers) {
    let steer = 0;
    let throttle = 0;

    if (racer.isHuman) {
      steer = (state.keys[racer.controls.left] ? -1 : 0) + (state.keys[racer.controls.right] ? 1 : 0);
      throttle = (state.keys[racer.controls.up] ? 1 : 0) - (state.keys[racer.controls.down] ? 0.5 : 0);
    } else {
      const targetOffset = Math.sin((performance.now() / 700) + racer.aiSkill) * 0.16;
      steer = clamp((targetOffset - racer.offset) * 3, -1, 1);
      throttle = 0.8 + racer.aiSkill * 0.14;
    }

    racer.offset = clamp(racer.offset + steer * dt * 0.8, -0.5, 0.5);
    racer.boost = clamp(racer.boost + throttle * dt * 1.6, 0.25, 1.45);

    const speed = (racer.speedBase * 0.008 + racer.boost * 0.0022) * (1 - Math.abs(racer.offset) * 0.1);
    racer.progress += speed;
    racer.theta = (-Math.PI / 2) + (racer.progress % (Math.PI * 2));
    racer.lap = Math.floor(racer.progress / (Math.PI * 2));

    if (racer.lap >= race.lapsTarget && !race.winner) {
      race.winner = racer;
      state.running = false;
      state.won = racer.name === "Tú" || racer.name === "J1";

      ui.nextBtn.disabled = !(state.mode === "tournament" && state.won && state.race.stageIndex < TOURNAMENT_STAGES.length - 1);

      if (state.mode === "tournament") {
        if (state.won) {
          const reward = Math.round(450 * TOURNAMENT_STAGES[state.race.stageIndex].difficulty);
          state.money += reward;
          save();
          renderShop();
          ui.message.textContent = `🏆 Ganaste ${TOURNAMENT_STAGES[state.race.stageIndex].name} +$${reward}`;
        } else {
          ui.message.textContent = `Perdiste contra ${racer.name}. Reintenta ronda.`;
        }
      } else {
        ui.message.textContent = `Ganador PvP: ${racer.name}`;
      }
    }
  }

  const lead = race.racers[0];
  state.arcade.speedKmh = Math.round((lead.speedBase * 22) + lead.boost * 80);
  state.arcade.distance = lead.lap;
  state.arcade.target = race.lapsTarget;
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
  ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, 13);
  ctx.fillRect(x - w / 2 + 6, y + h / 2 - 19, w - 12, 13);
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
    return;
  }

  ctx.fillStyle = "#1b1b1b";
  ctx.beginPath();
  ctx.ellipse(h.x, h.y, 14, 10, 0, 0, Math.PI * 2);
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
function drawNitroPack(n) {
  ctx.fillStyle = "#58dcff";
  ctx.fillRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
  ctx.fillStyle = "#10263b";
  ctx.fillRect(n.x - 6, n.y - 14, 12, 28);
}

function drawArcade() {
  const a = state.arcade;

  ctx.fillStyle = "#1f2d31";
  ctx.fillRect(58, 0, 304, canvas.height);

  ctx.fillStyle = "#697079";
  ctx.fillRect(54, 0, 4, canvas.height);
  ctx.fillRect(362, 0, 4, canvas.height);

  ctx.fillStyle = "#e3e8ff";
  for (let y = -92 + a.roadOffset; y < canvas.height; y += 92) {
    ctx.fillRect(canvas.width / 2 - 3, y, 6, 48);
  }

  for (const t of a.traffic) drawCar(t.x, t.y, 36, 66, "#ff7388");
  for (const h of a.hazards) drawHazard(h);
  for (const b of a.boxes) drawBox(b);
  for (const n of a.nitros) drawNitro(n);

  drawCar(a.player.x, a.player.y, a.player.w, a.player.h, currentCar().color, performance.now() < a.nitroUntil);
}

function drawRaceCircuit() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const major = 145;
  const minor = 245;

  ctx.fillStyle = "#0f3d1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#4d4d53";
  ctx.beginPath();
  ctx.ellipse(cx, cy, major + 48, minor + 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#10261a";
  ctx.beginPath();
  ctx.ellipse(cx, cy, major - 48, minor - 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, major, minor, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const racer of state.race.racers) {
    const laneOffset = racer.offset * 26;
    const x = cx + Math.cos(racer.theta) * (major + laneOffset);
    const y = cy + Math.sin(racer.theta) * (minor + laneOffset);
    drawCar(x, y, 30, 54, racer.color, false);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px sans-serif";
  let y = 24;
  for (const racer of state.race.racers) {
    ctx.fillText(`${racer.name}: vuelta ${Math.min(racer.lap + 1, state.race.lapsTarget)}/${state.race.lapsTarget}`, 12, y);
    y += 20;
  }
}

function updateHUD() {
  const nitro = Math.max(0, state.arcade.nitroUntil - performance.now());

  ui.level.textContent = String(state.level);
  ui.money.textContent = String(Math.floor(state.money));
  ui.carName.textContent = currentCar().name;
  ui.speed.textContent = String(Math.floor(state.arcade.speedKmh));
  ui.nitro.textContent = state.mode === "arcade" ? (nitro > 0 ? `${(nitro / 1000).toFixed(1)}s` : "No") : "N/A";
  ui.target.textContent = state.mode === "arcade" ? String(Math.round(state.arcade.target)) : `Vueltas ${state.race.lapsTarget}`;
  ui.distance.textContent = state.mode === "arcade" ? String(Math.floor(state.arcade.distance)) : String(Math.floor(state.arcade.distance));
}

function renderShop() {
  ui.shopList.innerHTML = "";

  for (const car of cars) {
    const owned = state.ownedCars.includes(car.id);
    const selected = state.selectedCar === car.id;

    const card = document.createElement("div");
    card.className = "car-card";
    card.innerHTML = `
      <p><strong>${car.name}</strong> - $${car.price}</p>
      <p>Velocidad: ${car.speed.toFixed(1)} | Control: ${car.control.toFixed(1)} | Bonus: x${car.reward.toFixed(2)}</p>
      <div class="preview-row">
        <span class="color-chip" style="background:${car.color}"></span>
        <span class="mini-car" style="background:${car.color}"></span>
        <small>Color real</small>
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
      save();
      renderShop();
      updateHUD();
    };

    actions.append(buyBtn, selectBtn);
    ui.shopList.append(card);
  }
}

function startCurrentMode() {
  state.mode = ui.modeSelect.value;
  state.running = true;
  state.won = false;
  ui.nextBtn.disabled = true;

  if (state.mode === "arcade") {
    resetArcade();
    ui.message.textContent = `Nivel ${state.level}: evita tráfico y llega a meta.`;
    return;
  }

  if (state.mode === "tournament") {
    const stage = TOURNAMENT_STAGES[state.race.stageIndex];
    ui.message.textContent = `Torneo ${stage.name}: gana a ${stage.rivals} rivales IA.`;
  } else {
    ui.message.textContent = "PvP: J1 flechas, J2 WASD.";
  }

  resetRaceMode();
}

function handleKeyChange(event, pressed) {
  const key = event.key.toLowerCase();
  if (key === "arrowleft") state.keys.left = pressed;
  if (key === "arrowright") state.keys.right = pressed;
  if (key === "arrowup") state.keys.up = pressed;
  if (key === "arrowdown") state.keys.down = pressed;
  if (key === "a") state.keys.a = pressed;
  if (key === "d") state.keys.d = pressed;
  if (key === "w") state.keys.w = pressed;
  if (key === "s") state.keys.s = pressed;
}

ui.startBtn.onclick = startCurrentMode;
ui.nextBtn.onclick = () => {
  if (state.mode === "arcade") {
    if (state.won && state.level < TOTAL_LEVELS) {
      state.level += 1;
      save();
      startCurrentMode();
    }
    return;
  }

  if (state.mode === "tournament" && state.won && state.race.stageIndex < TOURNAMENT_STAGES.length - 1) {
    state.race.stageIndex += 1;
    startCurrentMode();
  }
};

ui.modeSelect.onchange = () => {
  if (ui.modeSelect.value !== "tournament") state.race.stageIndex = 0;
  ui.nextBtn.disabled = true;
};

window.addEventListener("keydown", (event) => handleKeyChange(event, true));
window.addEventListener("keyup", (event) => handleKeyChange(event, false));

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

  if (state.running) {
    if (state.mode === "arcade") updateArcade(dt, ts);
    else updateRace(dt);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.mode === "arcade") drawArcade();
  else drawRaceCircuit();

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
updateHUD();
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

const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v6";
const STORAGE_KEY = "carreras167-save-v5";

const TOURNAMENT_STAGES = [
  { name: "16avos", rivals: 1, difficulty: 1.0 },
  { name: "8avos", rivals: 2, difficulty: 1.1 },
  { name: "4tos", rivals: 3, difficulty: 1.2 },
  { name: "Semis", rivals: 4, difficulty: 1.35 },
  { name: "Final", rivals: 5, difficulty: 1.5 },
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
  { name: "🚀 Cohete", desc: "+15m", apply: () => { state.arcade.distance += 15; } },
  { name: "💰 Bolsa", desc: "+$220", apply: () => { state.money += 220; } },
  { name: "🛡️ Escudo", desc: "Ignora 1 choque", apply: () => { state.arcade.shield += 1; } },
  { name: "🧲 Imán", desc: "+dinero 7s", apply: () => { state.arcade.moneyBoostUntil = performance.now() + 7000; } },
  { name: "🛠️ Limpieza", desc: "Quita obstáculos", apply: () => { state.arcade.hazards = []; } },
  { name: "🕳️ Bache", desc: "-8m", apply: () => { state.arcade.distance = Math.max(0, state.arcade.distance - 8); } },
  { name: "💸 Multa", desc: "-$180", apply: () => { state.money = Math.max(0, state.money - 180); } },
  { name: "🛢️ Derrape", desc: "Control bajo 5s", apply: () => { state.arcade.slipUntil = performance.now() + 5000; } },
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
    lapLength: 1800,
  },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rect = (x, y, w, h) => ({ x: x - w / 2, y: y - h / 2, w, h });
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    level: state.level,
    money: state.money,
    selectedCar: state.selectedCar,
    ownedCars: state.ownedCars,
  }));
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      level: state.level,
      money: state.money,
      selectedCar: state.selectedCar,
      ownedCars: state.ownedCars,
    })
  );
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
    // ignore corrupted save
  }
}

function setEffect(title, desc) {
  ui.effectTitle.textContent = title;
  ui.effectDesc.textContent = desc;
}

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
  return { name, color, isHuman, controls, speedBase, aiSkill, progress: 0, lap: 0, boost: 0.9, offset: 0 };
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
    racers.push(createRacer("Tú", car.color, true, { left: "left", right: "right", up: "up", down: "down" }, car.speed * 1.05));
    for (let i = 0; i < stage.rivals; i += 1) {
      racers.push(createRacer(`IA ${i + 1}`, `hsl(${(i * 67 + 20) % 360} 80% 65%)`, false, null, (6.7 + i * 0.45) * stage.difficulty, 0.9 + i * 0.06));
    }

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
    racers.push(createRacer("J1", car.color, true, { left: "left", right: "right", up: "up", down: "down" }, car.speed * 1.03));
    racers.push(createRacer("J2", "#ffbb55", true, { left: "a", right: "d", up: "w", down: "s" }, Math.max(6.4, car.speed * 0.99)));
    racers.push(createRacer("J1", car.color, true, { left: "left", right: "right", up: "up", down: "down" }, car.speed * 0.88));
    racers.push(createRacer("J2", "#ffbb55", true, { left: "a", right: "d", up: "w", down: "s" }, Math.max(6.4, car.speed * 0.85)));
    state.race.lapsTarget = 3;
    ui.tournamentRound.textContent = "PvP";
    ui.tournamentInfo.textContent = "J1: Flechas | J2: WASD";
  }

  racers.forEach((r, i) => {
    r.progress = -i * 30;
    r.lap = 0;
    r.offset = (i % 2 === 0 ? -0.15 : 0.15);
  });
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
  const pRect = rect(a.player.x, a.player.y, a.player.w, a.player.h);

  for (const t of a.traffic) {
    t.y += (cfg.trafficSpeed + car.speed * 0.22 + (nitroActive ? 1.1 : 0)) * 112 * dt;
    if (intersects(pRect, rect(t.x, t.y, t.w, t.h)) && loseArcade()) return;
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
    if (!intersects(pRect, rect(h.x, h.y, h.w, h.h))) continue;
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
    if (!intersects(pRect, rect(b.x, b.y, b.w, b.h))) continue;
    const s = surprises[Math.floor(Math.random() * surprises.length)];
    s.apply();
    setEffect(s.name, s.desc);
    if (!intersects(playerRect, rect(b.x, b.y, b.w, b.h))) continue;

    const surprise = surprises[Math.floor(Math.random() * surprises.length)];
    surprise.apply();
    setEffect(surprise.name, surprise.desc);
    b.y = canvas.height + 200;
  }

  for (const n of a.nitros) {
    n.y += (cfg.trafficSpeed + car.speed * 0.24) * 112 * dt;
    if (!intersects(pRect, rect(n.x, n.y, n.w, n.h))) continue;
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

function trackCurveAt(distance) {
  const d = distance * 0.0042;
  return Math.sin(d) * 0.45 + Math.sin(d * 0.43 + 1.6) * 0.28;
}

function updateRace(dt) {
  const race = state.race;
  const lapLen = race.lapLength;

  for (const r of race.racers) {
    let steer = 0;
    let throttle = 0;

    if (r.isHuman) {
      steer = (state.keys[r.controls.left] ? -1 : 0) + (state.keys[r.controls.right] ? 1 : 0);
      throttle = (state.keys[r.controls.up] ? 1 : 0) - (state.keys[r.controls.down] ? 0.55 : 0);
    } else {
      const targetOffset = Math.sin((r.progress / 240) + r.aiSkill) * 0.2;
      steer = clamp((targetOffset - r.offset) * 2.8, -1, 1);
      throttle = 0.82 + r.aiSkill * 0.14;
    }

    r.offset = clamp(r.offset + steer * dt * 1.05, -0.62, 0.62);
    r.boost = clamp(r.boost + throttle * dt * 1.6, 0.2, 1.5);

    const curvePenalty = 1 - Math.abs(trackCurveAt(r.progress)) * 0.08;
    const lanePenalty = 1 - Math.abs(r.offset) * 0.12;
    const speed = (r.speedBase * 21 + r.boost * 16) * curvePenalty * lanePenalty;

    r.progress += speed * dt;
    r.lap = Math.floor(Math.max(0, r.progress) / lapLen);

    if (r.lap >= race.lapsTarget && !race.winner) {
      race.winner = r;
      state.running = false;
      state.won = r.name === "Tú" || r.name === "J1";
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
          ui.message.textContent = `Perdiste contra ${r.name}. Reintenta ronda.`;
        }
      } else {
        ui.message.textContent = `Ganador PvP: ${r.name}`;
      }
    }
  }

  const p1 = race.racers[0];
  state.arcade.speedKmh = Math.round(p1.speedBase * 18 + p1.boost * 35);
  state.arcade.distance = p1.lap;
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
    return;
  }

  ctx.fillStyle = "#1b1b1b";
  ctx.beginPath();
  ctx.ellipse(h.x, h.y, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawArcade() {
  const a = state.arcade;
  ctx.fillStyle = "#1f2d31";
  ctx.fillRect(58, 0, 304, canvas.height);

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

function drawMiniMapRace() {
  const race = state.race;
  const x = canvas.width - 118;
  const y = 12;
  const w = 104;
  const h = 104;

  ctx.fillStyle = "rgb(0 0 0 / 45%)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#9bb5ff";
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = "#e8edff";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, 34, 42, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (const r of race.racers) {
    const p = ((r.progress % race.lapLength) + race.lapLength) % race.lapLength;
    const t = (p / race.lapLength) * Math.PI * 2;
    const px = x + w / 2 + Math.cos(t - Math.PI / 2) * 34;
    const py = y + h / 2 + Math.sin(t - Math.PI / 2) * 42;
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fff";
  ctx.font = "10px sans-serif";
  ctx.fillText("Mini mapa", x + 8, y + 14);
}

function drawRaceCurved() {
  const race = state.race;
  const player = race.racers[0];
  const cameraDist = player.progress;

  ctx.fillStyle = "#8cc3ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.42);
  ctx.fillStyle = "#2f6b36";
  ctx.fillRect(0, canvas.height * 0.42, canvas.width, canvas.height * 0.58);

  const slices = 60;
  for (let i = slices; i >= 1; i -= 1) {
    const z1 = i / slices;
    const z0 = (i - 1) / slices;
    const y1 = canvas.height * (0.42 + z1 * 0.58);
    const y0 = canvas.height * (0.42 + z0 * 0.58);

    const d1 = cameraDist + i * 28;
    const d0 = cameraDist + (i - 1) * 28;

    const c1 = trackCurveAt(d1) - player.offset * 0.85;
    const c0 = trackCurveAt(d0) - player.offset * 0.85;

    const w1 = 28 + z1 * 180;
    const w0 = 28 + z0 * 180;

    const cx1 = canvas.width / 2 + c1 * 160 * (1 - z1 + 0.3);
    const cx0 = canvas.width / 2 + c0 * 160 * (1 - z0 + 0.3);

    ctx.fillStyle = i % 2 === 0 ? "#5b5c63" : "#4e4f57";
    ctx.beginPath();
    ctx.moveTo(cx0 - w0, y0);
    ctx.lineTo(cx0 + w0, y0);
    ctx.lineTo(cx1 + w1, y1);
    ctx.lineTo(cx1 - w1, y1);
    ctx.closePath();
    ctx.fill();

    if (i % 8 < 4) {
      ctx.fillStyle = "#eef2ff";
      const laneW0 = w0 * 0.08;
      const laneW1 = w1 * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx0 - laneW0, y0);
      ctx.lineTo(cx0 + laneW0, y0);
      ctx.lineTo(cx1 + laneW1, y1);
      ctx.lineTo(cx1 - laneW1, y1);
      ctx.closePath();
      ctx.fill();
    }
  }

  const lookAhead = 950;
  for (let i = 1; i < race.racers.length; i += 1) {
    const r = race.racers[i];
    const delta = r.progress - player.progress;
    if (delta < 20 || delta > lookAhead) continue;

    const nz = delta / lookAhead;
    const y = canvas.height * (0.9 - nz * 0.58);
    const roadCurve = trackCurveAt(player.progress + delta) - player.offset * 0.85;
    const cx = canvas.width / 2 + roadCurve * 160 * (nz + 0.25);
    const roadHalf = 28 + (1 - nz) * 180;
    const x = cx + r.offset * roadHalf * 0.65;

    const carH = 8 + (1 - nz) * 34;
    const carW = carH * 0.56;
    drawCar(x, y, carW, carH, r.color);
  }

  drawCar(canvas.width / 2, canvas.height - 88, 40, 72, player.color);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px sans-serif";
  let y = 24;
  for (const r of race.racers) {
    ctx.fillText(`${r.name}: ${Math.min(r.lap + 1, race.lapsTarget)}/${race.lapsTarget}`, 12, y);
    y += 18;
  }

  drawMiniMapRace();
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
    ui.message.textContent = `Torneo ${stage.name}: curva real + mini mapa, gana a ${stage.rivals} IA.`;
  } else {
    ui.message.textContent = "PvP: igual que arcade pero en curva. J1 flechas, J2 WASD.";
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
  else drawRaceCurved();
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
requestAnimationFrame(frame);

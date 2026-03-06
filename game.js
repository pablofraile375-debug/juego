const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v2";

const cars = [
  { id: "starter", name: "Starter", price: 0, color: "#3fc1ff", speed: 6.0, control: 4.2, reward: 1 },
  { id: "city", name: "City GT", price: 500, color: "#62ff93", speed: 6.7, control: 4.7, reward: 1.05 },
  { id: "street", name: "Street Pro", price: 1400, color: "#ffe16f", speed: 7.4, control: 5.2, reward: 1.1 },
  { id: "turbo", name: "Turbo XR", price: 3200, color: "#ff9f63", speed: 8.2, control: 5.7, reward: 1.16 },
  { id: "rally", name: "Rally V8", price: 6800, color: "#ff6f91", speed: 9.0, control: 6.0, reward: 1.24 },
  { id: "hyper", name: "Hyper ZX", price: 12000, color: "#9f83ff", speed: 9.8, control: 6.4, reward: 1.35 },
  { id: "legend", name: "Legend One", price: 20000, color: "#ffffff", speed: 10.8, control: 6.9, reward: 1.5 },
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
  obstacles: [],
  lastObstacleSpawn: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 36,
    height: 66,
    vx: 0,
  },
  speedKmh: 0,
  nitro: 100,
  nitroActive: false,
  lastSpaceTap: 0,
  keys: { left: false, right: false },
  lastTime: 0,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rectFromCenter(obj) {
  return {
    x: obj.x - obj.width / 2,
    y: obj.y - obj.height / 2,
    w: obj.width,
    h: obj.height,
  };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
    // guardado inválido
  }
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
}

function currentCar() {
  return cars.find((c) => c.id === state.selectedCar) || cars[0];
}

function levelConfig(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1);
  return {
    trafficSpeed: 2.3 + t * 7.8,
    spawnEveryMs: 900 - t * 560,
    targetDistance: Math.round(900 + t * 5500),
    reward: Math.round((125 + level * 19) * (1 + t * 1.9)),
    nearMissReward: Math.round(18 + t * 65),
    passReward: Math.round(7 + t * 7),
    trafficCountCap: Math.round(4 + t * 11),
  };
}

function resetLevel() {
  const cfg = levelConfig(state.level);
  state.distance = 0;
  state.targetDistance = cfg.targetDistance;
  state.roadOffset = 0;
  state.obstacles = [];
  state.lastObstacleSpawn = 0;
  state.wonLevel = false;
  state.player.x = canvas.width / 2;
  state.player.vx = 0;
  state.speedKmh = 0;
  state.nitro = 100;
  state.nitroActive = false;
  ui.nextBtn.disabled = true;
  ui.message.textContent = `Nivel ${state.level}: sobrevive ${state.targetDistance}m. Nitro: doble espacio.`;
  updateHUD();
}

function updateHUD() {
  ui.level.textContent = String(state.level);
  ui.money.textContent = String(Math.floor(state.money));
  ui.carName.textContent = currentCar().name;
  ui.speed.textContent = String(Math.floor(state.speedKmh));
  ui.nitro.textContent = String(Math.floor(state.nitro));
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
        <span class="mini-car" style="background:${car.color}" aria-hidden="true"></span>
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

function spawnObstacle(now) {
  const cfg = levelConfig(state.level);
  if (now - state.lastObstacleSpawn < cfg.spawnEveryMs) return;
  if (state.obstacles.length >= cfg.trafficCountCap) return;

  state.lastObstacleSpawn = now;
  const laneWidth = 70;
  const roadCenter = canvas.width / 2;
  const lane = Math.floor(Math.random() * 4) - 1.5;
  const x = roadCenter + lane * laneWidth + (Math.random() * 20 - 10);
  state.obstacles.push({
    x,
    y: -90,
    w: 36,
    h: 66,
    color: `hsl(${Math.random() * 360} 75% 60%)`,
    nearAwarded: false,
  });
}

function tryActivateNitro(now) {
  const isDoubleSpace = now - state.lastSpaceTap < 320;
  state.lastSpaceTap = now;
  if (!isDoubleSpace) return;
  if (state.nitro < 25 || state.nitroActive || !state.running) return;

  state.nitroActive = true;
  ui.message.textContent = "⚡ Nitro activado";
}

function loseLevel() {
  state.running = false;
  state.nitroActive = false;
  ui.message.textContent = `💥 Choque en nivel ${state.level}. Pulsa Empezar/Reintentar.`;
}

function winLevel() {
  state.running = false;
  state.nitroActive = false;
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

  const steer = (state.keys.left ? -1 : 0) + (state.keys.right ? 1 : 0);
  const controlBoost = state.nitroActive ? 1.12 : 1;
  state.player.vx += steer * car.control * dt * 9.6 * controlBoost;
  state.player.vx *= 0.86;
  state.player.x += state.player.vx;
  state.player.x = clamp(state.player.x, 86, canvas.width - 86);

  if (state.nitroActive) {
    state.nitro -= 32 * dt;
    if (state.nitro <= 0) {
      state.nitro = 0;
      state.nitroActive = false;
      ui.message.textContent = "Nitro agotado.";
    }
  } else {
    state.nitro = clamp(state.nitro + 9 * dt, 0, 100);
  }

  const nitroFactor = state.nitroActive ? 2 : 1;
  const roadFlow = configSpeed(cfg, car, nitroFactor);
  state.speedKmh = roadFlow * 24;
  state.roadOffset = (state.roadOffset + roadFlow * 170 * dt) % 92;

  spawnObstacle(now);
  const playerRect = rectFromCenter(state.player);

  for (const obs of state.obstacles) {
    obs.y += (cfg.trafficSpeed + car.speed * 0.2 + (state.nitroActive ? 1.4 : 0)) * 112 * dt;
    const obsRect = { x: obs.x - obs.w / 2, y: obs.y - obs.h / 2, w: obs.w, h: obs.h };

    if (intersects(playerRect, obsRect)) {
      loseLevel();
      return;
    }

    const verticalClose = Math.abs(state.player.y - obs.y) < 60;
    const horizontalGap = Math.abs(state.player.x - obs.x) - (state.player.width + obs.w) / 2;
    const nearMiss = verticalClose && horizontalGap > 0 && horizontalGap < 10;
    if (nearMiss && !obs.nearAwarded) {
      obs.nearAwarded = true;
      const bonus = Math.round(cfg.nearMissReward * car.reward * (state.nitroActive ? 1.2 : 1));
      state.money += bonus;
      ui.message.textContent = `🔥 Casi choque! +$${bonus}`;
    }
  }

  const before = state.obstacles.length;
  state.obstacles = state.obstacles.filter((o) => o.y < canvas.height + 100);
  const passed = before - state.obstacles.length;
  if (passed > 0) {
    state.money += passed * Math.round(cfg.passReward * car.reward);
  }

  state.distance += (car.speed * 8.3 + cfg.trafficSpeed * 6.5) * nitroFactor * dt;
  if (state.distance >= state.targetDistance) {
    winLevel();
  }

  updateHUD();
}

function configSpeed(cfg, car, nitroFactor) {
  return cfg.trafficSpeed + car.speed * 0.34 * nitroFactor;
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

function drawCar(x, y, w, h, color, withNitro = false) {
  if (withNitro) {
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  for (const obs of state.obstacles) {
    drawCar(obs.x, obs.y, obs.w, obs.h, obs.color);
  }

  drawCar(state.player.x, state.player.y, state.player.width, state.player.height, currentCar().color, state.nitroActive);

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

ui.startBtn.onclick = () => {
  resetLevel();
  state.running = true;
};

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
  if (key === " ") {
    e.preventDefault();
    tryActivateNitro(performance.now());
  }
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

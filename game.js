const TOTAL_LEVELS = 167;
const STORAGE_KEY = "carreras167-save-v1";

const cars = [
  { id: "starter", name: "Starter", price: 0, color: "#3fc1ff", speed: 6.2, control: 4.4, reward: 1 },
  { id: "city", name: "City GT", price: 500, color: "#62ff93", speed: 6.8, control: 4.8, reward: 1.05 },
  { id: "street", name: "Street Pro", price: 1400, color: "#ffe16f", speed: 7.4, control: 5.3, reward: 1.1 },
  { id: "turbo", name: "Turbo XR", price: 3200, color: "#ff9f63", speed: 8.1, control: 5.7, reward: 1.16 },
  { id: "rally", name: "Rally V8", price: 6800, color: "#ff6f91", speed: 8.9, control: 6.1, reward: 1.24 },
  { id: "hyper", name: "Hyper ZX", price: 12000, color: "#9f83ff", speed: 9.7, control: 6.5, reward: 1.35 },
  { id: "legend", name: "Legend One", price: 20000, color: "#ffffff", speed: 10.7, control: 6.9, reward: 1.5 },
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("level"),
  money: document.getElementById("money"),
  carName: document.getElementById("carName"),
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
    y: canvas.height - 90,
    width: 36,
    height: 64,
    vx: 0,
  },
  keys: { left: false, right: false },
  lastTime: 0,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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
    // ignorar guardado corrupto
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
    trafficSpeed: 2.2 + t * 7.4,
    spawnEveryMs: 900 - t * 550,
    targetDistance: Math.round(900 + t * 5200),
    reward: Math.round((120 + level * 18) * (1 + t * 1.8)),
    trafficCountCap: Math.round(4 + t * 10),
  };
}

function resetLevel() {
  const config = levelConfig(state.level);
  state.distance = 0;
  state.targetDistance = config.targetDistance;
  state.roadOffset = 0;
  state.obstacles = [];
  state.lastObstacleSpawn = 0;
  state.wonLevel = false;
  state.player.x = canvas.width / 2;
  state.player.vx = 0;
  ui.nextBtn.disabled = true;
  ui.message.textContent = `Nivel ${state.level}: sobrevive hasta ${state.targetDistance}m.`;
  updateHUD();
}

function updateHUD() {
  ui.level.textContent = String(state.level);
  ui.money.textContent = String(Math.floor(state.money));
  ui.carName.textContent = currentCar().name;
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
  const config = levelConfig(state.level);
  if (now - state.lastObstacleSpawn < config.spawnEveryMs) return;
  if (state.obstacles.length >= config.trafficCountCap) return;

  state.lastObstacleSpawn = now;
  const laneWidth = 70;
  const roadCenter = canvas.width / 2;
  const lane = Math.floor(Math.random() * 4) - 1.5;
  const x = roadCenter + lane * laneWidth + (Math.random() * 24 - 12);
  state.obstacles.push({
    x,
    y: -80,
    w: 34,
    h: 62,
    color: `hsl(${Math.random() * 360} 80% 60%)`,
  });
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.width > b.x &&
    a.y < b.y + b.h &&
    a.y + a.height > b.y
  );
}

function loseLevel() {
  state.running = false;
  ui.message.textContent = `💥 Choque en nivel ${state.level}. Pulsa Empezar/Reintentar.`;
}

function winLevel() {
  state.running = false;
  state.wonLevel = true;
  const config = levelConfig(state.level);
  const bonus = Math.round(config.reward * currentCar().reward);
  state.money += bonus;
  ui.message.textContent = `🏁 ¡Nivel superado! Ganaste $${bonus}.`;
  ui.nextBtn.disabled = state.level >= TOTAL_LEVELS;
  save();
  renderShop();
  updateHUD();
}

function update(dt, now) {
  if (!state.running) return;

  const car = currentCar();
  const config = levelConfig(state.level);

  const steer = (state.keys.left ? -1 : 0) + (state.keys.right ? 1 : 0);
  state.player.vx += steer * car.control * dt * 8;
  state.player.vx *= 0.88;
  state.player.x += state.player.vx;
  state.player.x = clamp(state.player.x, 90, canvas.width - 90);

  state.roadOffset = (state.roadOffset + (config.trafficSpeed + car.speed * 0.25) * 200 * dt) % 80;

  spawnObstacle(now);
  for (const obs of state.obstacles) {
    obs.y += (config.trafficSpeed + car.speed * 0.15) * 110 * dt;
    if (intersects(state.player, obs)) {
      loseLevel();
      return;
    }
  }

  const before = state.obstacles.length;
  state.obstacles = state.obstacles.filter((o) => o.y < canvas.height + 90);
  const passed = before - state.obstacles.length;
  if (passed > 0) {
    state.money += passed * Math.round(6 * currentCar().reward);
  }

  state.distance += (car.speed * 8 + config.trafficSpeed * 6) * dt;
  if (state.distance >= state.targetDistance) {
    winLevel();
  }

  updateHUD();
}

function drawRoad() {
  ctx.fillStyle = "#233";
  ctx.fillRect(60, 0, 300, canvas.height);

  ctx.fillStyle = "#4e535a";
  ctx.fillRect(55, 0, 5, canvas.height);
  ctx.fillRect(360, 0, 5, canvas.height);

  ctx.fillStyle = "#dbe5ff";
  for (let y = -80 + state.roadOffset; y < canvas.height; y += 80) {
    ctx.fillRect(canvas.width / 2 - 3, y, 6, 40);
  }
}

function drawCar(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "#0c0f1d";
  ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, 16);
  ctx.fillRect(x - w / 2 + 6, y + h / 2 - 22, w - 12, 16);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  for (const obs of state.obstacles) {
    drawCar(obs.x, obs.y + obs.h / 2, obs.w, obs.h, obs.color);
  }

  const p = state.player;
  drawCar(p.x, p.y, p.width, p.height, currentCar().color);

  if (!state.running) {
    ctx.fillStyle = "rgb(0 0 0 / 45%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    if (state.level > TOTAL_LEVELS) {
      ctx.fillText("¡Juego completado!", canvas.width / 2, canvas.height / 2);
    } else if (state.wonLevel) {
      ctx.fillText("Nivel superado", canvas.width / 2, canvas.height / 2);
    } else {
      ctx.fillText("Pulsa Empezar", canvas.width / 2, canvas.height / 2);
    }
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
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.left = true;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.right = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.left = false;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.right = false;
});

loadSave();
resetLevel();
renderShop();
requestAnimationFrame(frame);

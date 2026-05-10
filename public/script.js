const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ================= ASSETS ================= */
const bgImg = new Image();
bgImg.src = MAP_IMAGE_SRC; // Pulls from index.html config

const slimeImg = new Image();
slimeImg.src = 'png/slime.png';

// GAME STATE
let gold = 250;
let lives = 20;
let wave = 1;
let waveActive = false;
let autoStart = false;
let selectedTypeIdx = 0;
let selectedPlacedTower = null;
let mousePos = { x: 0, y: 0 };

const towerTypes = [
    { name: "Sentry", color: "#3498db", cost: 100, range: 250, fireRate: 30, damage: 15, explosive: false },
    { name: "Sniper", color: "#2ecc71", cost: 200, range: 550, fireRate: 110, damage: 150, explosive: false },
    { name: "Rapid", color: "#f39c12", cost: 180, range: 200, fireRate: 8, damage: 8, explosive: false },
    { name: "Cannon", color: "#e74c3c", cost: 300, range: 320, fireRate: 80, damage: 90, explosive: true },
    { name: "Mega", color: "#9b59b6", cost: 600, range: 450, fireRate: 30, damage: 60, explosive: false }
];

const enemyTypes = [
    { name: "Slime", hp: 40, speed: 2.5, size: 35, color: "#2ecc71" },
    { name: "Knight", hp: 180, speed: 1.5, size: 40, color: "#95a5a6", isLead: true }
];

let towers = [];
let enemies = [];
let bullets = [];
let enemiesToSpawn = 0;
let spawnTimer = 0;

/* ================= CLASSES ================= */
class Enemy {
    constructor() {
        const type = (wave > 3 && Math.random() > 0.7) ? enemyTypes[1] : enemyTypes[0];
        this.type = type;
        this.x = path[0].x;
        this.y = path[0].y;
        this.pathIndex = 0;
        this.maxHp = type.hp * (1 + (wave * 0.35));
        this.hp = this.maxHp;
        this.speed = type.speed * (0.8 + (wave * 0.05));
    }

    update() {
        const target = path[this.pathIndex + 1];
        if (!target) { lives--; return false; }
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed) this.pathIndex++;
        else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        return true;
    }

    draw() {
        if (this.type.name === "Slime" && slimeImg.complete) {
            ctx.drawImage(slimeImg, this.x - this.type.size, this.y - this.type.size, this.type.size * 2, this.type.size * 2);
        } else {
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.type.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "black";
        ctx.fillRect(this.x - 30, this.y - this.type.size - 15, 60, 8);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(this.x - 30, this.y - this.type.size - 15, 60 * (this.hp / this.maxHp), 8);
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.type = type;
        this.cooldown = 0;
        this.angle = 0;
    }
    update() {
        if (this.cooldown > 0) this.cooldown--;
        let target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < this.type.range);
        if (target) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            if (this.cooldown <= 0) {
                bullets.push(new Bullet(this.x, this.y, target, this.type));
                this.cooldown = this.type.fireRate;
            }
        }
    }
    draw() {
        if (selectedPlacedTower === this) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.type.range, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.stroke();
        }
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.type.color;
        ctx.fillRect(0, -10, 45, 20);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, target, type) {
        this.x = x; this.y = y;
        this.target = target;
        this.type = type;
        this.speed = 20;
    }
    update() {
        if (!enemies.includes(this.target)) return false;
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed) {
            if (!this.target.type.isLead || this.type.explosive) this.target.hp -= this.type.damage;
            return false;
        }
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        return true;
    }
    draw() {
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ================= CORE LOOP ================= */
function update() {
    if (waveActive) {
        spawnTimer++;
        if (spawnTimer > 30 && enemiesToSpawn > 0) {
            enemies.push(new Enemy());
            enemiesToSpawn--;
            spawnTimer = 0;
        }
        if (enemiesToSpawn === 0 && enemies.length === 0) {
            waveActive = false;
            wave++;
            gold += 100;
            if (document.getElementById("autoStart").checked) startWave();
        }
    }
    enemies.forEach((e, i) => { 
        if(!e.update()) enemies.splice(i, 1);
        else if(e.hp <= 0) { gold += 20; enemies.splice(i, 1); }
    });
    towers.forEach(t => t.update());
    bullets = bullets.filter(b => b.update());

    document.getElementById("gold").innerText = gold;
    document.getElementById("lives").innerText = lives;
    document.getElementById("wave").innerText = wave;
    if (lives <= 0) { alert("Game Over!"); location.reload(); }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#1b4d2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (!waveActive && !selectedPlacedTower) {
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, towerTypes[selectedTypeIdx].range, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fill();
    }
    towers.forEach(t => t.draw());
    enemies.forEach(e => e.draw());
    bullets.forEach(b => b.draw());
}

function startWave() {
    if (waveActive) return;
    enemiesToSpawn = 5 + (wave * 2);
    waveActive = true;
}

/* ================= UI & CONTROLS ================= */
function renderButtons() {
    const container = document.getElementById("towerButtons");
    container.innerHTML = "";
    towerTypes.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.className = "tower-btn" + (selectedTypeIdx === i ? " selected" : "");
        btn.innerHTML = `${t.name}<br>💰${t.cost}`;
        btn.onclick = () => { selectedTypeIdx = i; selectedPlacedTower = null; renderButtons(); };
        container.appendChild(btn);
    });
}

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.x = (e.clientX - rect.left) * scaleX;
    mousePos.y = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener("click", () => {
    const clicked = towers.find(t => Math.hypot(t.x - mousePos.x, t.y - mousePos.y) < 40);
    if (clicked) {
        selectedPlacedTower = clicked;
        document.getElementById("sellBtn").style.display = "block";
    } else {
        const type = towerTypes[selectedTypeIdx];
        if (gold >= type.cost) {
            towers.push(new Tower(mousePos.x, mousePos.y, type));
            gold -= type.cost;
            selectedPlacedTower = null;
            document.getElementById("sellBtn").style.display = "none";
        }
    }
    renderButtons();
});

document.getElementById("startBtn").onclick = startWave;
document.getElementById("sellBtn").onclick = () => {
    if (selectedPlacedTower) {
        gold += Math.floor(selectedPlacedTower.type.cost * 0.7);
        towers = towers.filter(t => t !== selectedPlacedTower);
        selectedPlacedTower = null;
        document.getElementById("sellBtn").style.display = "none";
    }
};

renderButtons();
function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();

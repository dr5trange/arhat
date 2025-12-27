class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1200;
        this.canvas.height = 800;

        this.gameState = 'playerSelect';
        this.selectedPlayer = null;
        this.level = 1;
        this.score = 0;
        this.misses = 0;
        this.currentWeapon = 'Brick';
        this.currentWindow = 0;
        this.currentLetter = '';
        this.timer = 10;
        this.windowCount = 3;
        this.windows = [];
        this.playerPos = { x: 100, y: 600 };
        this.castlePos = { x: 800, y: 150 };
        this.timerInterval = null;
        this.waitingForEnter = false;
        this.waitingForLevelStart = false;
        this.particles = [];
        this.projectiles = [];
        this.trajectoryTrails = [];
        this.animatingWeapon = null;
        this.weaponAnimationTime = 0;
        this.bonusRound = false;
        this.bonusWord = '';
        this.bonusTyped = '';
        this.bonusTimer = 30;
        this.bonusTimerInterval = null;
        this.explosionParticles = [];
        this.splatters = [];
        this.delayedProjectiles = [];
        this.castleDebris = [];

        this.weapons = [
            { name: 'Brick', cost: 0, damage: 1, color: '#8B4513', icon: '🧱', projectile: '🧱', breakSound: 'thud', splatColor: '#8B4513', splatSize: 1 },
            { name: 'Slingshot', cost: 50, damage: 2, color: '#654321', icon: '🏹', projectile: '🪨', breakSound: 'ping', splatColor: '#8B4513', splatSize: 0.8 },
            { name: 'Water Balloon', cost: 100, damage: 3, color: '#4169E1', icon: '🎈', projectile: '💧', breakSound: 'splash', splatColor: '#4169E1', splatSize: 1.5 },
            { name: 'Paintball Gun', cost: 200, damage: 4, color: '#FF6347', icon: '🔫', projectile: '🎨', breakSound: 'pop', splatColor: '#FF6347', splatSize: 1.2 },
            { name: 'Foam Dart Blaster', cost: 350, damage: 5, color: '#FFA500', icon: '🏹', projectile: '🎯', breakSound: 'thwack', splatColor: '#FFA500', splatSize: 0.9 },
            { name: 'Laser Pointer', cost: 500, damage: 6, color: '#FF0000', icon: '🔦', projectile: '⚡', breakSound: 'zap', splatColor: '#FF0000', splatSize: 0.7 },
            { name: 'Magic Wand', cost: 750, damage: 7, color: '#9370DB', icon: '🪄', projectile: '✨', breakSound: 'sparkle', splatColor: '#9370DB', splatSize: 2 },
            { name: 'Rainbow Cannon', cost: 1000, damage: 8, color: '#FF69B4', icon: '🌈', projectile: '🌟', breakSound: 'boom', splatColor: '#FF69B4', splatSize: 2.5 }
        ];

        this.ownedWeapons = ['Brick'];
        this.bonusWords = ['CAT', 'DOG', 'SUN', 'CAR', 'BAT', 'FUN', 'BOX', 'HAT', 'BIG', 'RED', 'HOT', 'RUN', 'TOP', 'WIN', 'YES', 'ZOO', 'EGG', 'ICE', 'JOY', 'KEY'];

        this.setupEventListeners();
        this.generateWindows();
        this.gameLoop();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                if (this.bonusRound) {
                    if (e.key === 'Backspace') {
                        this.bonusTyped = this.bonusTyped.slice(0, -1);
                    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
                        this.bonusTyped += e.key.toUpperCase();
                        if (this.bonusTyped === this.bonusWord) {
                            this.completeBonusRound();
                        }
                    }
                } else if (this.waitingForLevelStart && e.key === 'Enter') {
                    this.waitingForLevelStart = false;
                    this.nextWindow();
                } else if (this.waitingForEnter && e.key === 'Enter') {
                    this.nextWindow();
                } else if (!this.waitingForEnter && !this.waitingForLevelStart && e.key.toLowerCase() === this.currentLetter.toLowerCase()) {
                    this.hitTarget();
                }
            } else if (this.gameState === 'shop' && e.key === 'Enter') {
                this.closeShop();
            }
        });
    }

    generateWindows() {
        this.windows = [];
        const floors = Math.ceil(this.windowCount / 3);
        let windowIndex = 0;

        for (let floor = 0; floor < floors; floor++) {
            const windowsOnFloor = Math.min(3, this.windowCount - windowIndex);
            for (let i = 0; i < windowsOnFloor; i++) {
                this.windows.push({
                    x: this.castlePos.x + 60 + (i * 100),
                    y: this.castlePos.y + 80 + (floor * 120),
                    width: 80,
                    height: 80,
                    broken: false,
                    lit: false,
                    letter: ''
                });
                windowIndex++;
            }
        }
    }

    selectCharacter(character) {
        this.selectedPlayer = character;
        document.getElementById('playerSelect').classList.add('hidden');
        this.gameState = 'playing';
        this.startLevel();
    }

    startLevel() {
        this.currentWindow = 0;
        this.misses = 0;
        this.windowCount = 3 + ((this.level - 1) * 2);
        this.generateWindows();
        this.waitingForLevelStart = true;
        this.updateUI();
    }

    nextWindow() {
        this.waitingForEnter = false;
        this.waitingForLevelStart = false;

        if (this.currentWindow < this.windows.length) {
            this.windows.forEach(w => w.lit = false);

            const window = this.windows[this.currentWindow];
            window.lit = true;
            window.letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            this.currentLetter = window.letter;

            this.timer = 10;
            this.startTimer();
        } else {
            this.startBonusRound();
        }
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.timer--;
            if (this.timer <= 0) {
                this.missTarget();
            }
        }, 1000);
    }

    hitTarget() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        const window = this.windows[this.currentWindow];
        const points = Math.max(5, 10 - Math.floor((10 - this.timer) / 2));
        this.score += points;

        setTimeout(() => {
            this.shootProjectile(window);
        }, 1000);

        this.waitingForEnter = true;
        this.currentWindow++;

        this.updateUI();
    }

    missTarget() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.misses++;
        const window = this.windows[this.currentWindow];
        window.lit = false;

        if (this.misses >= 3) {
            this.gameOver();
            return;
        }

        this.waitingForEnter = true;
        this.currentWindow++;
        this.updateUI();
    }

    createBreakEffect(window, weapon) {
        const particleCount = weapon.damage * 3 + 10;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: window.x + window.width / 2,
                y: window.y + window.height / 2,
                vx: (Math.random() - 0.5) * (weapon.damage * 2 + 8),
                vy: (Math.random() - 0.5) * (weapon.damage * 2 + 8),
                life: 40 + weapon.damage * 5,
                color: weapon.color,
                size: Math.random() * weapon.damage + 2,
                type: 'glass'
            });
        }

        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: window.x + Math.random() * window.width,
                y: window.y + Math.random() * window.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 60,
                color: '#C0C0C0',
                size: Math.random() * 3 + 1,
                type: 'glass'
            });
        }
    }

    createSplatterEffect(window, weapon) {
        for (let i = 0; i < weapon.splatSize * 8; i++) {
            this.splatters.push({
                x: window.x + Math.random() * window.width,
                y: window.y + Math.random() * window.height,
                size: Math.random() * weapon.splatSize * 3 + 2,
                color: weapon.splatColor,
                life: 180 + Math.random() * 60,
                maxLife: 240
            });
        }
    }

    startBonusRound() {
        this.bonusRound = true;
        this.bonusWord = this.bonusWords[Math.floor(Math.random() * this.bonusWords.length)];
        this.bonusTyped = '';
        this.bonusTimer = 30;
        this.startBonusTimer();
    }

    startBonusTimer() {
        this.bonusTimerInterval = setInterval(() => {
            this.bonusTimer--;
            if (this.bonusTimer <= 0) {
                this.failBonusRound();
            }
        }, 1000);
    }

    completeBonusRound() {
        if (this.bonusTimerInterval) {
            clearInterval(this.bonusTimerInterval);
        }
        this.score += 100;

        setTimeout(() => {
            this.explodeCastle();
        }, 1000);

        setTimeout(() => {
            this.bonusRound = false;
            this.levelComplete();
        }, 4000);
    }

    failBonusRound() {
        if (this.bonusTimerInterval) {
            clearInterval(this.bonusTimerInterval);
        }
        this.bonusRound = false;
        this.levelComplete();
    }

    levelComplete() {
        this.level++;
        this.showShop();
    }

    explodeCastle() {
        const floors = Math.ceil(this.windowCount / 3);
        const castleHeight = 200 + (floors * 120);
        const castleWidth = 350 + (floors * 30);

        this.playSound('boom');

        for (let i = 0; i < 80; i++) {
            this.explosionParticles.push({
                x: this.castlePos.x + Math.random() * castleWidth,
                y: this.castlePos.y + Math.random() * castleHeight,
                vx: (Math.random() - 0.5) * 25,
                vy: (Math.random() - 0.5) * 25 - 5,
                life: 80,
                color: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#FF8C42', '#C44569'][Math.floor(Math.random() * 6)],
                size: Math.random() * 12 + 6
            });
        }

        for (let i = 0; i < 40; i++) {
            const debrisX = this.castlePos.x + Math.random() * castleWidth;
            const debrisY = this.castlePos.y + Math.random() * castleHeight;

            this.castleDebris.push({
                x: debrisX,
                y: debrisY,
                vx: (Math.random() - 0.5) * 15,
                vy: Math.random() * -10 - 5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 20 + 10,
                life: 120,
                color: ['#A0A0A0', '#808080', '#696969', '#8B4513'][Math.floor(Math.random() * 4)],
                shape: Math.random() > 0.5 ? 'rect' : 'triangle'
            });
        }

        setTimeout(() => {
            this.playSound('thud');
        }, 500);

        setTimeout(() => {
            this.playSound('thud');
        }, 1000);
    }

    showShop() {
        this.gameState = 'shop';
        const shop = document.getElementById('shop');
        const weaponList = document.getElementById('weaponList');

        weaponList.innerHTML = '';

        this.weapons.forEach(weapon => {
            if (!this.ownedWeapons.includes(weapon.name)) {
                const btn = document.createElement('button');
                btn.className = 'weapon-btn';
                btn.innerHTML = `${weapon.icon} ${weapon.name} - ${weapon.cost} pts`;
                btn.disabled = this.score < weapon.cost;
                btn.onclick = () => this.buyWeapon(weapon);
                btn.onmouseenter = () => this.previewWeapon(weapon);
                weaponList.appendChild(btn);
            }
        });

        shop.style.display = 'block';
    }

    buyWeapon(weapon) {
        if (this.score >= weapon.cost) {
            this.score -= weapon.cost;
            this.ownedWeapons.push(weapon.name);
            this.currentWeapon = weapon.name;
            this.updateUI();
            this.showShop();
        }
    }

    previewWeapon(weapon) {
        this.animatingWeapon = weapon;
        this.weaponAnimationTime = 0;
    }

    shootProjectile(targetWindow) {
        const weapon = this.weapons.find(w => w.name === this.currentWeapon);
        const startX = this.playerPos.x + 30;
        const startY = this.playerPos.y - 20;
        const endX = targetWindow.x + targetWindow.width / 2;
        const endY = targetWindow.y + targetWindow.height / 2;

        this.projectiles.push({
            x: startX,
            y: startY,
            startX: startX,
            startY: startY,
            targetX: endX,
            targetY: endY,
            weapon: weapon,
            progress: 0,
            targetWindow: targetWindow,
            trail: []
        });

        this.playSound('shoot');
    }

    closeShop() {
        document.getElementById('shop').style.display = 'none';
        this.gameState = 'playing';
        this.startLevel();
    }

    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `Final Score: ${this.score} | Level Reached: ${this.level}`;
        document.getElementById('gameOver').style.display = 'block';
    }

    restartGame() {
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('playerSelect').classList.remove('hidden');
        this.gameState = 'playerSelect';
        this.level = 1;
        this.score = 0;
        this.misses = 0;
        this.currentWeapon = 'Brick';
        this.ownedWeapons = ['Brick'];
        this.projectiles = [];
        this.particles = [];
        this.explosionParticles = [];
        this.splatters = [];
        this.delayedProjectiles = [];
        this.castleDebris = [];
        this.updateUI();
    }

    playSound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (type === 'shoot') {
            this.createBeepSound(audioContext, 440, 0.1);
        } else if (type === 'thud') {
            this.createNoiseSound(audioContext, 0.2);
        } else if (type === 'ping') {
            this.createBeepSound(audioContext, 880, 0.15);
        } else if (type === 'splash') {
            this.createNoiseSound(audioContext, 0.3, 'highpass');
        } else if (type === 'pop') {
            this.createBeepSound(audioContext, 220, 0.1);
        } else if (type === 'thwack') {
            this.createNoiseSound(audioContext, 0.15);
        } else if (type === 'zap') {
            this.createBeepSound(audioContext, 1760, 0.05);
        } else if (type === 'sparkle') {
            this.createBeepSound(audioContext, 1320, 0.2);
            setTimeout(() => this.createBeepSound(audioContext, 1760, 0.15), 50);
        } else if (type === 'boom') {
            this.createNoiseSound(audioContext, 0.5, 'lowpass');
        }
    }

    createBeepSound(audioContext, frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    createNoiseSound(audioContext, duration, filterType = null) {
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioContext.createBufferSource();
        whiteNoise.buffer = buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        if (filterType) {
            const filter = audioContext.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.setValueAtTime(filterType === 'highpass' ? 1000 : 500, audioContext.currentTime);

            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
        } else {
            whiteNoise.connect(gainNode);
            gainNode.connect(audioContext.destination);
        }

        whiteNoise.start(audioContext.currentTime);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('misses').textContent = this.misses;
        document.getElementById('currentWeapon').textContent = this.currentWeapon;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'playing' || this.gameState === 'shop') {
            this.drawBackground();
            this.drawPlayer();
            this.drawCastle();
            this.drawSplatters();
            this.drawWindows();
            this.drawProjectiles();
            this.drawParticles();
            this.drawExplosionParticles();
            this.drawCastleDebris();

            if (this.gameState === 'playing' && this.windows[this.currentWindow] && this.windows[this.currentWindow].lit) {
                this.drawTimer();
            }

            if (this.waitingForEnter) {
                this.drawEnterPrompt();
            }

            if (this.waitingForLevelStart) {
                this.drawLevelStartPrompt();
            }

            if (this.gameState === 'shop' && this.animatingWeapon) {
                this.drawWeaponPreview();
            }

            if (this.bonusRound) {
                this.drawBonusRound();
            }
        }
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
    }

    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.playerPos.x, this.playerPos.y);

        const color = this.selectedPlayer === 'mikey' ? '#32CD32' : '#FF4444';

        this.ctx.fillStyle = '#2E8B57';
        this.ctx.fillRect(-15, -5, 30, 8);

        this.ctx.fillStyle = color;
        this.ctx.fillRect(-18, -50, 36, 45);

        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(-16, -25, 32, 20);

        this.ctx.fillStyle = '#FFE4B5';
        this.ctx.beginPath();
        this.ctx.arc(0, -65, 18, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-12, -80, 24, 15);

        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(-6, -70, 2, 0, Math.PI * 2);
        this.ctx.arc(6, -70, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, -60, 6, 0, Math.PI);
        this.ctx.stroke();

        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-20, -45, 8, 25);
        this.ctx.fillRect(12, -45, 8, 25);

        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(-20, -5, 12, 8);
        this.ctx.fillRect(8, -5, 12, 8);

        const weapon = this.weapons.find(w => w.name === this.currentWeapon);
        this.ctx.fillStyle = weapon.color;
        this.ctx.fillRect(25, -30, 15, 8);

        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(weapon.icon, 42, -20);

        this.ctx.restore();
    }

    drawCastle() {
        const floors = Math.ceil(this.windowCount / 3);
        const castleHeight = 200 + (floors * 120);
        const castleWidth = 350 + (floors * 30);

        this.ctx.fillStyle = '#A0A0A0';
        this.ctx.fillRect(this.castlePos.x, this.castlePos.y, castleWidth, castleHeight);

        this.ctx.fillStyle = '#808080';
        for (let i = 0; i < 5; i++) {
            const towerX = this.castlePos.x + (i * castleWidth / 4) - 15;
            const towerHeight = castleHeight + 40;
            this.ctx.fillRect(towerX, this.castlePos.y - 40, 30, towerHeight);

            this.ctx.fillStyle = '#696969';
            for (let j = 0; j < 4; j++) {
                this.ctx.fillRect(towerX + (j * 8), this.castlePos.y - 50, 6, 10);
            }
            this.ctx.fillStyle = '#808080';
        }

        this.ctx.fillStyle = '#654321';
        const gateWidth = 60;
        const gateHeight = 80;
        this.ctx.fillRect(
            this.castlePos.x + castleWidth / 2 - gateWidth / 2,
            this.castlePos.y + castleHeight - gateHeight,
            gateWidth,
            gateHeight
        );

        this.ctx.strokeStyle = '#4A4A4A';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.castlePos.x, this.castlePos.y, castleWidth, castleHeight);

        this.ctx.fillStyle = '#FF6B6B';
        for (let i = 1; i < 4; i++) {
            this.ctx.fillRect(
                this.castlePos.x + (i * castleWidth / 4) - 2,
                this.castlePos.y - 60,
                4,
                20
            );
        }
    }

    drawWindows() {
        this.windows.forEach(window => {
            if (window.broken) {
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(window.x, window.y, window.width, window.height);

                this.ctx.strokeStyle = '#666';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(window.x, window.y);
                this.ctx.lineTo(window.x + window.width, window.y + window.height);
                this.ctx.moveTo(window.x + window.width, window.y);
                this.ctx.lineTo(window.x, window.y + window.height);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = window.lit ? '#FFFF99' : '#87CEEB';
                this.ctx.fillRect(window.x, window.y, window.width, window.height);

                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(window.x, window.y, window.width, window.height);

                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(window.x + window.width / 2, window.y);
                this.ctx.lineTo(window.x + window.width / 2, window.y + window.height);
                this.ctx.moveTo(window.x, window.y + window.height / 2);
                this.ctx.lineTo(window.x + window.width, window.y + window.height / 2);
                this.ctx.stroke();

                if (window.lit && window.letter) {
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 36px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        window.letter,
                        window.x + window.width / 2,
                        window.y + window.height / 2
                    );
                }
            }
        });
    }

    drawTimer() {
        const window = this.windows[this.currentWindow];
        if (window) {
            this.ctx.fillStyle = this.timer <= 3 ? '#FF0000' : '#000';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.timer, window.x + window.width / 2, window.y - 20);
        }
    }

    drawEnterPrompt() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, this.canvas.height - 60, this.canvas.width, 60);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press ENTER to continue...', this.canvas.width / 2, this.canvas.height - 25);
    }

    drawLevelStartPrompt() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, this.canvas.height / 2 - 50, this.canvas.width, 100);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Level ${this.level} - ${this.windowCount} windows to break!`, this.canvas.width / 2, this.canvas.height / 2 - 10);
        this.ctx.fillText('Press ENTER to start...', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    drawProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            proj.progress += 0.03;

            const deltaX = proj.targetX - proj.startX;
            const deltaY = proj.targetY - proj.startY;
            const arcHeight = Math.abs(deltaX) * 0.3;

            proj.x = proj.startX + deltaX * proj.progress;
            proj.y = proj.startY + deltaY * proj.progress - Math.sin(proj.progress * Math.PI) * arcHeight;

            proj.trail.push({ x: proj.x, y: proj.y, life: 20 });
            if (proj.trail.length > 8) {
                proj.trail.shift();
            }

            for (let j = 0; j < proj.trail.length; j++) {
                const trail = proj.trail[j];
                this.ctx.globalAlpha = (trail.life / 20) * (j / proj.trail.length);
                this.ctx.fillStyle = proj.weapon.color;
                this.ctx.beginPath();
                this.ctx.arc(trail.x, trail.y, 3 * (j / proj.trail.length), 0, Math.PI * 2);
                this.ctx.fill();
                trail.life--;
            }

            this.ctx.globalAlpha = 1;
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(proj.weapon.projectile, proj.x, proj.y);

            if (proj.progress >= 1) {
                proj.targetWindow.broken = true;
                proj.targetWindow.lit = false;
                this.createBreakEffect(proj.targetWindow, proj.weapon);
                this.createSplatterEffect(proj.targetWindow, proj.weapon);
                this.playSound(proj.weapon.breakSound);
                this.projectiles.splice(i, 1);
            }
        }
    }

    drawWeaponPreview() {
        if (this.animatingWeapon) {
            this.weaponAnimationTime += 0.1;

            const previewX = this.canvas.width / 2;
            const previewY = this.canvas.height / 2 + 100;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(previewX - 100, previewY - 50, 200, 100);

            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.animatingWeapon.icon} ${this.animatingWeapon.name}`, previewX, previewY - 20);

            const shootX = previewX - 50 + Math.sin(this.weaponAnimationTime * 2) * 30;
            this.ctx.font = '24px Arial';
            this.ctx.fillText(this.animatingWeapon.projectile, shootX, previewY + 10);

            if (this.weaponAnimationTime > 4) {
                this.animatingWeapon = null;
                this.weaponAnimationTime = 0;
            }
        }
    }

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3;
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawSplatters() {
        for (let i = this.splatters.length - 1; i >= 0; i--) {
            const splatter = this.splatters[i];

            this.ctx.globalAlpha = splatter.life / splatter.maxLife;
            this.ctx.fillStyle = splatter.color;
            this.ctx.beginPath();
            this.ctx.arc(splatter.x, splatter.y, splatter.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            splatter.life--;
            if (splatter.life <= 0) {
                this.splatters.splice(i, 1);
            }
        }
    }

    drawExplosionParticles() {
        for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
            const particle = this.explosionParticles[i];

            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 60;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.5;
            particle.life--;

            if (particle.life <= 0) {
                this.explosionParticles.splice(i, 1);
            }
        }
    }

    drawBonusRound() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆 BONUS ROUND! 🏆', this.canvas.width / 2, 150);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Type this word to explode the castle!', this.canvas.width / 2, 200);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillText(this.bonusWord, this.canvas.width / 2, 280);

        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText(this.bonusTyped, this.canvas.width / 2, 350);

        const timeColor = this.bonusTimer <= 10 ? '#FF4444' : '#FFF';
        this.ctx.fillStyle = timeColor;
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`Time: ${this.bonusTimer}s`, this.canvas.width / 2, 420);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Complete for +100 bonus points!', this.canvas.width / 2, 460);
    }

    drawCastleDebris() {
        for (let i = this.castleDebris.length - 1; i >= 0; i--) {
            const debris = this.castleDebris[i];

            this.ctx.save();
            this.ctx.translate(debris.x, debris.y);
            this.ctx.rotate(debris.rotation);
            this.ctx.globalAlpha = debris.life / 120;
            this.ctx.fillStyle = debris.color;

            if (debris.shape === 'rect') {
                this.ctx.fillRect(-debris.size / 2, -debris.size / 2, debris.size, debris.size);
            } else {
                this.ctx.beginPath();
                this.ctx.moveTo(0, -debris.size / 2);
                this.ctx.lineTo(debris.size / 2, debris.size / 2);
                this.ctx.lineTo(-debris.size / 2, debris.size / 2);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();

            debris.x += debris.vx;
            debris.y += debris.vy;
            debris.vy += 0.4;
            debris.rotation += debris.rotationSpeed;
            debris.vx *= 0.99;
            debris.life--;

            if (debris.life <= 0 || debris.y > this.canvas.height) {
                this.castleDebris.splice(i, 1);
            }
        }
    }

    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

function selectCharacter(character) {
    game.selectCharacter(character);
}

function closeShop() {
    game.closeShop();
}

function restartGame() {
    game.restartGame();
}

const game = new Game();
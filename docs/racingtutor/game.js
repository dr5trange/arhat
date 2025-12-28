class RacingTutorGame {
    constructor() {
        this.gameState = 'menu';
        this.score = 0;
        this.timeRemaining = 120;
        this.level = 1;
        this.levelProgress = 0;
        this.starsToNextLevel = 10;
        this.carPosition = 1;
        this.gameItems = [];
        this.keys = {};
        this.isPaused = false;
        this.gameSpeed = 1;
        this.soundEnabled = true;

        this.baseItemSpeed = 2;
        this.baseSpawnRate = 0.02;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupElements();
        this.soundManager = new SoundManager();
    }

    setupElements() {
        this.elements = {
            gameContainer: document.getElementById('game-container'),
            startScreen: document.getElementById('start-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            levelUpScreen: document.getElementById('level-up-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            road: document.getElementById('road'),
            car: document.getElementById('car'),
            scoreDisplay: document.getElementById('score'),
            timerDisplay: document.getElementById('timer'),
            levelDisplay: document.getElementById('level-display'),
            levelProgressBar: document.getElementById('level-progress-bar'),
            soundToggle: document.getElementById('sound-toggle'),
            pauseBtn: document.getElementById('pause-btn')
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueLevelUp());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restartGame());

        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
    }

    handleKeyDown(e) {
        if (this.gameState !== 'playing' || this.isPaused) return;

        this.keys[e.key.toLowerCase()] = true;

        if (['a', 's', 'd'].includes(e.key.toLowerCase())) {
            this.handleLaneChange(e.key.toLowerCase());
        } else if (this.isValidCollectionKey(e.key)) {
            this.handleStarCollection(e.key);
        }

        e.preventDefault();
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    isValidCollectionKey(key) {
        return /^[0-9a-zA-Z]$/.test(key);
    }

    handleLaneChange(key) {
        const laneMap = { 'a': 0, 's': 1, 'd': 2 };
        if (laneMap.hasOwnProperty(key)) {
            this.carPosition = laneMap[key];
            this.updateCarPosition();
        }
    }

    updateCarPosition() {
        const laneWidth = 200;
        const carOffset = 70;
        this.elements.car.style.left = `${this.carPosition * laneWidth + carOffset}px`;
    }

    handleStarCollection(key) {
        const targetChar = key.toLowerCase();
        const starsInLane = this.gameItems.filter(item =>
            item.type === 'star' &&
            item.lane === this.carPosition &&
            item.char.toLowerCase() === targetChar &&
            this.isInCollectionRange(item)
        );

        if (starsInLane.length > 0) {
            const star = starsInLane[0];
            this.collectStar(star);
        }
    }

    isInCollectionRange(item) {
        const carBottom = window.innerHeight - 170;
        const carTop = carBottom - 120;
        return item.y >= carTop - 50 && item.y <= carBottom + 50;
    }

    collectStar(star) {
        this.score++;
        this.levelProgress++;
        this.updateLevelProgress();

        if (this.soundEnabled) {
            if (star.starType === 'letter') {
                this.soundManager.playLetterSound(star.char.toLowerCase());
            } else {
                this.soundManager.playCollectSound();
            }
        }

        this.removeGameItem(star);
        this.addCelebrationEffect(star);
        this.updateDisplay();

        if (this.levelProgress >= this.starsToNextLevel) {
            this.levelUp();
        }
    }

    addCelebrationEffect(star) {
        const celebration = document.createElement('div');
        celebration.textContent = '+1 ⭐';
        celebration.style.cssText = `
            position: absolute;
            left: ${star.element.style.left};
            top: ${star.element.style.top};
            color: #FFD700;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            animation: celebrationPop 1s ease-out forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes celebrationPop {
                0% { transform: scale(0.5); opacity: 1; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1) translateY(-50px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        this.elements.road.appendChild(celebration);
        setTimeout(() => {
            celebration.remove();
            style.remove();
        }, 1000);
    }

    levelUp() {
        this.level++;
        this.levelProgress = 0;
        this.gameSpeed += 0.3;
        this.starsToNextLevel = Math.floor(this.starsToNextLevel * 1.2);

        this.showLevelUpScreen();

        if (this.soundEnabled) {
            this.soundManager.playLevelUpSound();
        }
    }

    showLevelUpScreen() {
        this.isPaused = true;
        document.getElementById('level-up-text').textContent = `Level ${this.level} Reached!`;
        this.elements.levelUpScreen.classList.remove('hidden');
    }

    continueLevelUp() {
        this.elements.levelUpScreen.classList.add('hidden');
        this.isPaused = false;
        this.updateDisplay();
    }

    updateLevelProgress() {
        const progressPercent = (this.levelProgress / this.starsToNextLevel) * 100;
        this.elements.levelProgressBar.style.width = `${progressPercent}%`;
    }

    startGame() {
        this.gameState = 'playing';
        this.elements.startScreen.classList.add('hidden');
        this.resetGame();
        this.gameLoop();
        this.startTimer();
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.levelProgress = 0;
        this.starsToNextLevel = 10;
        this.timeRemaining = 120;
        this.carPosition = 1;
        this.gameSpeed = 1;
        this.gameItems = [];
        this.isPaused = false;

        this.clearGameItems();
        this.updateCarPosition();
        this.updateDisplay();
        this.updateLevelProgress();
    }

    clearGameItems() {
        this.gameItems.forEach(item => {
            if (item.element && item.element.parentNode) {
                item.element.parentNode.removeChild(item.element);
            }
        });
        this.gameItems = [];
    }

    pauseGame() {
        if (this.gameState !== 'playing') return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.elements.pauseScreen.classList.remove('hidden');
            this.elements.pauseBtn.textContent = '▶️';
        } else {
            this.elements.pauseScreen.classList.add('hidden');
            this.elements.pauseBtn.textContent = '⏸️';
        }
    }

    resumeGame() {
        this.isPaused = false;
        this.elements.pauseScreen.classList.add('hidden');
        this.elements.pauseBtn.textContent = '⏸️';
    }

    restartGame() {
        this.gameState = 'menu';
        this.elements.gameOverScreen.classList.add('hidden');
        this.elements.pauseScreen.classList.add('hidden');
        this.elements.levelUpScreen.classList.add('hidden');
        this.elements.startScreen.classList.remove('hidden');
        this.clearGameItems();
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.elements.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        this.soundManager.setEnabled(this.soundEnabled);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isPaused || this.gameState !== 'playing') return;

            this.timeRemaining--;
            this.updateDisplay();

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;

        if (!this.isPaused) {
            this.spawnGameItems();
            this.updateGameItems();
            this.checkCollisions();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    spawnGameItems() {
        const currentSpawnRate = this.baseSpawnRate * this.gameSpeed;

        if (Math.random() < currentSpawnRate) {
            if (Math.random() < 0.7) {
                this.spawnStar();
            } else {
                this.spawnObstacle();
            }
        }
    }

    spawnStar() {
        const lane = Math.floor(Math.random() * 3);
        const isLetter = Math.random() < 0.6;

        let char, starType;
        if (isLetter) {
            char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            starType = 'letter';
        } else {
            char = Math.floor(Math.random() * 10).toString();
            starType = 'number';
        }

        const star = this.createGameItem('star', lane, char, starType);
        this.gameItems.push(star);
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        const obstacle = this.createGameItem('obstacle', lane);
        this.gameItems.push(obstacle);
    }

    createGameItem(type, lane, char = '', starType = '') {
        const element = document.createElement('div');
        element.className = type + (starType ? ` ${starType}` : '');

        if (type === 'star') {
            element.textContent = char;
        }

        const laneWidth = 200;
        const itemWidth = type === 'star' ? 80 : 70;
        const laneOffset = (laneWidth - itemWidth) / 2;

        element.style.left = `${lane * laneWidth + laneOffset}px`;
        element.style.top = '-80px';

        this.elements.road.appendChild(element);

        return {
            type,
            element,
            lane,
            char,
            starType,
            y: -80,
            speed: this.baseItemSpeed * this.gameSpeed
        };
    }

    updateGameItems() {
        for (let i = this.gameItems.length - 1; i >= 0; i--) {
            const item = this.gameItems[i];
            item.y += item.speed;
            item.element.style.top = `${item.y}px`;

            if (item.y > window.innerHeight) {
                this.removeGameItem(item);
            }
        }
    }

    removeGameItem(item) {
        const index = this.gameItems.indexOf(item);
        if (index > -1) {
            this.gameItems.splice(index, 1);
            if (item.element && item.element.parentNode) {
                item.element.parentNode.removeChild(item.element);
            }
        }
    }

    checkCollisions() {
        const carY = window.innerHeight - 170;
        const carHeight = 120;
        const carWidth = 60;
        const laneWidth = 200;
        const carX = this.carPosition * laneWidth + 70;

        this.gameItems.forEach(item => {
            if (item.lane === this.carPosition) {
                const itemY = item.y;
                const itemHeight = 70;

                if (itemY + itemHeight >= carY && itemY <= carY + carHeight) {
                    if (item.type === 'obstacle') {
                        this.handleObstacleCollision(item);
                    }
                }
            }
        });
    }

    handleObstacleCollision(obstacle) {
        this.score = Math.max(0, this.score - 1);
        this.removeGameItem(obstacle);

        this.elements.car.classList.add('collision-effect');
        setTimeout(() => {
            this.elements.car.classList.remove('collision-effect');
        }, 500);

        if (this.soundEnabled) {
            this.soundManager.playCollisionSound();
        }

        this.updateDisplay();
    }

    updateDisplay() {
        this.elements.scoreDisplay.textContent = `Stars: ${this.score}`;

        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.elements.timerDisplay.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.elements.levelDisplay.textContent = `Level ${this.level}`;
    }

    endGame() {
        this.gameState = 'ended';
        clearInterval(this.timerInterval);

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;

        const performanceMessage = this.getPerformanceMessage();
        document.getElementById('performance-message').textContent = performanceMessage;

        this.elements.gameOverScreen.classList.remove('hidden');

        if (this.soundEnabled) {
            this.soundManager.playGameOverSound();
        }
    }

    getPerformanceMessage() {
        if (this.score >= 50) return "🌟 Amazing typing skills! You're a racing champion!";
        if (this.score >= 30) return "🎉 Great job! Keep practicing to become even faster!";
        if (this.score >= 15) return "👍 Good effort! You're improving your typing skills!";
        return "🚀 Nice try! Practice makes perfect - race again!";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RacingTutorGame();
});
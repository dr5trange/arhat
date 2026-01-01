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
        this.lastSpawnY = -200; // Track last spawn position to ensure one per row
        this.minSpawnGap = 150; // Minimum vertical gap between stars
        this.announcedItems = new Set(); // Track items that have been announced

        // Shop and car system - stars persist via localStorage
        this.totalStars = parseInt(localStorage.getItem('racingTutorStars')) || 0;
        this.cars = [
            { id: 'red', name: 'Red Racer', price: 0, color: 'linear-gradient(180deg, #FF4444, #CC0000)', emoji: '🏎️' },
            { id: 'blue', name: 'Blue Bolt', price: 20, color: 'linear-gradient(180deg, #4444FF, #0000CC)', emoji: '🚙' },
            { id: 'green', name: 'Green Machine', price: 35, color: 'linear-gradient(180deg, #44FF44, #00CC00)', emoji: '🚗' },
            { id: 'gold', name: 'Golden Flash', price: 50, color: 'linear-gradient(180deg, #FFD700, #FFA500)', emoji: '✨' },
            { id: 'purple', name: 'Purple Thunder', price: 75, color: 'linear-gradient(180deg, #9944FF, #6600CC)', emoji: '🔮' },
            { id: 'rainbow', name: 'Rainbow Rider', price: 100, color: 'linear-gradient(180deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #9400D3)', emoji: '🌈' }
        ];
        this.ownedCars = JSON.parse(localStorage.getItem('racingTutorOwnedCars')) || ['red'];
        this.selectedCar = localStorage.getItem('racingTutorSelectedCar') || 'red';

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
            shopScreen: document.getElementById('shop-screen'),
            road: document.getElementById('road'),
            car: document.getElementById('car'),
            scoreDisplay: document.getElementById('score'),
            timerDisplay: document.getElementById('timer'),
            levelDisplay: document.getElementById('level-display'),
            levelProgressBar: document.getElementById('level-progress-bar'),
            soundToggle: document.getElementById('sound-toggle'),
            pauseBtn: document.getElementById('pause-btn'),
            shopStars: document.getElementById('shop-stars'),
            carList: document.getElementById('car-list')
        };
        this.applyCarStyle();
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
        document.getElementById('shop-btn').addEventListener('click', () => this.openShop());
        document.getElementById('close-shop-btn').addEventListener('click', () => this.closeShop());
    }

    handleKeyDown(e) {
        if (this.gameState !== 'playing' || this.isPaused) return;

        this.keys[e.key.toLowerCase()] = true;

        // Check if a valid letter/digit key was pressed for star collection
        if (this.isValidCollectionKey(e.key)) {
            this.handleStarCollection(e.key);
        }

        e.preventDefault();
    }

    isValidCollectionKey(key) {
        return /^[0-9a-zA-Z]$/.test(key);
    }

    handleStarCollection(key) {
        const targetChar = key.toUpperCase();
        const carY = window.innerHeight - 170;

        // Large tolerance zone - stars can be collected from 300px above to 100px below the car
        const collectionTop = carY - 300;
        const collectionBottom = carY + 100;

        // Find stars in the car's lane that are in collection range
        const starsInRange = this.gameItems.filter(item =>
            item.type === 'star' &&
            item.lane === this.carPosition &&
            item.y >= collectionTop && item.y <= collectionBottom
        );

        if (starsInRange.length > 0) {
            const closestStar = starsInRange[0];
            // Only collect if the correct key was pressed
            if (closestStar.char.toUpperCase() === targetChar) {
                this.collectStar(closestStar);
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    updateCarPosition() {
        const laneWidth = 200;
        const carOffset = 70;
        this.elements.car.style.left = `${this.carPosition * laneWidth + carOffset}px`;
    }

    collectStar(star) {
        this.score++;
        this.levelProgress++;
        this.updateLevelProgress();

        if (this.soundEnabled) {
            this.soundManager.playCollectSound();
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
        this.announcedItems = new Set(); // Clear announced items

        // Reload totalStars from localStorage to ensure persistence
        this.totalStars = parseInt(localStorage.getItem('racingTutorStars')) || 0;

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

        // Reload totalStars from localStorage on restart
        this.totalStars = parseInt(localStorage.getItem('racingTutorStars')) || 0;
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
            this.autoNavigateAndAnnounce();
            // Stars are collected by typing the correct letter/digit
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    autoNavigateAndAnnounce() {
        // Find the closest approaching star
        const carY = window.innerHeight - 170;
        const announceDistance = 300; // Distance at which to announce the letter

        // Sort stars by y position (closest first)
        const approachingStars = this.gameItems
            .filter(item => item.type === 'star' && item.y < carY)
            .sort((a, b) => b.y - a.y);

        if (approachingStars.length > 0) {
            const closestStar = approachingStars[0];

            // Auto-navigate car to the star's lane
            if (this.carPosition !== closestStar.lane) {
                this.carPosition = closestStar.lane;
                this.updateCarPosition();
            }

            // Announce the letter when it gets close enough
            if (closestStar.y > carY - announceDistance && !this.announcedItems.has(closestStar.id)) {
                this.announcedItems.add(closestStar.id);
                if (this.soundEnabled) {
                    this.soundManager.speakLetter(closestStar.char);
                }
            }
        }
    }

    spawnGameItems() {
        // Check if we can spawn (ensure minimum gap between stars)
        const lowestStar = this.gameItems.reduce((lowest, item) => {
            if (item.type === 'star' && item.y < lowest) return item.y;
            return lowest;
        }, Infinity);

        // Only spawn if there's enough gap from the last star
        if (lowestStar === Infinity || lowestStar > this.minSpawnGap) {
            this.spawnStar();
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
        star.id = Date.now() + Math.random(); // Unique ID for tracking announcements
        this.gameItems.push(star);
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

        // Add score to total stars and save immediately
        this.totalStars += this.score;
        localStorage.setItem('racingTutorStars', this.totalStars);

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;

        const performanceMessage = this.getPerformanceMessage();
        document.getElementById('performance-message').textContent = performanceMessage;

        this.elements.gameOverScreen.classList.remove('hidden');

        if (this.soundEnabled) {
            this.soundManager.playGameOverSound();
        }
    }

    // Shop methods
    openShop() {
        if (this.gameState === 'playing') {
            this.isPaused = true;
        }
        this.elements.shopStars.textContent = this.totalStars;
        this.renderCarList();
        this.elements.shopScreen.classList.remove('hidden');
    }

    closeShop() {
        this.elements.shopScreen.classList.add('hidden');
        if (this.gameState === 'playing') {
            this.isPaused = false;
        }
    }

    renderCarList() {
        this.elements.carList.innerHTML = '';

        this.cars.forEach(car => {
            const isOwned = this.ownedCars.includes(car.id);
            const isSelected = this.selectedCar === car.id;
            const canAfford = this.totalStars >= car.price;

            const carItem = document.createElement('div');
            carItem.className = `car-item ${isOwned ? 'owned' : ''} ${isSelected ? 'selected' : ''}`;

            carItem.innerHTML = `
                <div class="car-preview" style="background: ${car.color};"></div>
                <div class="car-name">${car.emoji} ${car.name}</div>
                <div class="car-price">${car.price === 0 ? 'Free' : car.price + ' ⭐'}</div>
                ${isOwned ?
                    `<button class="car-btn ${isSelected ? 'selected-btn' : ''}" data-car-id="${car.id}">
                        ${isSelected ? '✓ Selected' : 'Select'}
                    </button>` :
                    `<button class="car-btn" data-car-id="${car.id}" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'Buy' : 'Need ' + (car.price - this.totalStars) + ' more'}
                    </button>`
                }
            `;

            const btn = carItem.querySelector('.car-btn');
            btn.addEventListener('click', () => {
                if (isOwned) {
                    this.selectCar(car.id);
                } else if (canAfford) {
                    this.buyCar(car.id, car.price);
                }
            });

            this.elements.carList.appendChild(carItem);
        });
    }

    buyCar(carId, price) {
        if (this.totalStars >= price && !this.ownedCars.includes(carId)) {
            this.totalStars -= price;
            this.ownedCars.push(carId);
            this.selectedCar = carId;

            localStorage.setItem('racingTutorStars', this.totalStars);
            localStorage.setItem('racingTutorOwnedCars', JSON.stringify(this.ownedCars));
            localStorage.setItem('racingTutorSelectedCar', this.selectedCar);

            this.applyCarStyle();
            this.elements.shopStars.textContent = this.totalStars;
            this.renderCarList();

            if (this.soundEnabled) {
                this.soundManager.playCollectSound();
            }
        }
    }

    selectCar(carId) {
        if (this.ownedCars.includes(carId)) {
            this.selectedCar = carId;
            localStorage.setItem('racingTutorSelectedCar', this.selectedCar);
            this.applyCarStyle();
            this.renderCarList();
        }
    }

    applyCarStyle() {
        const car = this.cars.find(c => c.id === this.selectedCar);
        if (car && this.elements.car) {
            this.elements.car.style.background = car.color;
            this.elements.car.setAttribute('data-emoji', car.emoji);

            // Update the ::after pseudo-element via CSS variable
            this.elements.car.style.setProperty('--car-emoji', `"${car.emoji}"`);
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

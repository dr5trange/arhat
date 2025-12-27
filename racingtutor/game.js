class RacingTutorGame {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.playerCar = document.getElementById('playerCar');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.instructions = document.getElementById('instructions');
        this.gameOver = document.getElementById('gameOver');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.soundToggle = document.getElementById('soundToggle');
        this.finalScore = document.getElementById('finalScore');
        this.performanceMessage = document.getElementById('performanceMessage');
        this.speedLevelDisplay = document.getElementById('speedLevel');

        this.gameWidth = window.innerWidth;
        this.gameHeight = window.innerHeight;
        this.roadWidth = 400;
        this.roadLeft = (this.gameWidth - this.roadWidth) / 2;

        // Game state
        this.score = 0;
        this.gameRunning = false;
        this.gameTimeMs = 120000; // 2 minutes in milliseconds
        this.timeRemaining = this.gameTimeMs;
        this.startTime = 0;

        // Game objects
        this.obstacles = [];
        this.stars = [];
        this.baseGameSpeed = 3; // Current speed becomes level 5
        this.speedLevel = 3; // Default to medium speed
        this.gameSpeed = this.calculateGameSpeed();

        // Player car auto-movement
        this.carLane = 1; // 0=left, 1=center, 2=right
        this.carPosition = {
            x: this.gameWidth / 2,
            y: this.gameHeight * 0.85 // 15% from bottom
        };

        // Dodge mechanics
        this.dodging = false;
        this.dodgeStartTime = 0;
        this.dodgeDuration = 500; // ms

        this.init();
    }

    init() {
        this.playAgainBtn.addEventListener('click', () => this.resetGame());
        this.soundToggle.addEventListener('click', () => this.toggleSound());
        this.setupSpeedSelector();
        this.setupKeyboard();
        this.updateCarPosition();
        this.updateTimer();
        this.updateSpeedDisplay();
        this.updateVisualSpeed();
        this.setupWindowResize();
    }

    calculateGameSpeed() {
        // Speed level 1 = 0.6x, level 2 = 0.8x, level 3 = 1x, level 4 = 1.2x, level 5 = 1.5x
        const speedMultipliers = {
            1: 0.4,  // Very slow
            2: 0.7,  // Slow
            3: 1.0,  // Medium (original speed)
            4: 1.3,  // Fast
            5: 1.7   // Very fast (current becomes level 5)
        };
        return this.baseGameSpeed * speedMultipliers[this.speedLevel];
    }

    setupSpeedSelector() {
        const speedButtons = document.querySelectorAll('.speed-btn');
        speedButtons.forEach(button => {
            button.addEventListener('click', () => {
                const speed = parseInt(button.dataset.speed);
                this.setSpeedLevel(speed);

                // Update active button
                speedButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Start the game immediately
                this.startGame();
            });
        });
    }

    setSpeedLevel(level) {
        this.speedLevel = level;
        this.gameSpeed = this.calculateGameSpeed();
        this.updateSpeedDisplay();
        this.updateVisualSpeed();
    }

    updateSpeedDisplay() {
        this.speedLevelDisplay.textContent = this.speedLevel;
    }

    updateVisualSpeed() {
        // Remove existing speed classes
        for (let i = 1; i <= 5; i++) {
            this.gameArea.classList.remove(`speed-${i}`);
        }
        // Add current speed class
        this.gameArea.classList.add(`speed-${this.speedLevel}`);
    }

    setupWindowResize() {
        window.addEventListener('resize', () => {
            this.gameWidth = window.innerWidth;
            this.gameHeight = window.innerHeight;
            this.roadLeft = (this.gameWidth - this.roadWidth) / 2;
            this.carPosition.x = this.gameWidth / 2;
            this.carPosition.y = this.gameHeight * 0.85;
            this.updateCarPosition();
        });
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;

            const key = e.key.toLowerCase();

            // Handle number keys 0-9 for star collection
            if (key >= '0' && key <= '9') {
                this.tryCollectStar(key);
                e.preventDefault();
            }

            // Handle A, S, D keys for dodging
            if (['a', 's', 'd'].includes(key)) {
                this.dodge(key);
                e.preventDefault();
            }
        });
    }

    startGame() {
        this.instructions.style.display = 'none';
        this.gameOver.style.display = 'none';
        this.gameRunning = true;
        this.score = 0;
        this.timeRemaining = this.gameTimeMs;
        this.startTime = Date.now();
        this.obstacles = [];
        this.stars = [];
        this.gameSpeed = this.calculateGameSpeed(); // Use speed based on selected level
        this.carLane = 1;
        this.dodging = false;

        this.updateCarPosition();
        this.gameLoop();
        this.spawnItems();
    }

    resetGame() {
        this.gameOver.style.display = 'none';
        this.instructions.style.display = 'block';
    }

    gameLoop() {
        if (!this.gameRunning) return;

        this.updateTimer();
        this.updateCarMovement();
        this.updateObstacles();
        this.updateStars();
        this.checkCollisions();
        this.updateScore();

        // Check if time is up
        if (this.timeRemaining <= 0) {
            this.endGame();
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateTimer() {
        if (this.gameRunning) {
            this.timeRemaining = Math.max(0, this.gameTimeMs - (Date.now() - this.startTime));
        }

        const minutes = Math.floor(this.timeRemaining / 60000);
        const seconds = Math.floor((this.timeRemaining % 60000) / 1000);
        this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateCarMovement() {
        // Auto-move the car forward slightly (visual effect)
        const targetX = this.roadLeft + (this.carLane + 0.5) * (this.roadWidth / 3);

        // Handle dodge movement
        if (this.dodging) {
            const dodgeProgress = (Date.now() - this.dodgeStartTime) / this.dodgeDuration;
            if (dodgeProgress >= 1) {
                this.dodging = false;
            }
        }

        // Smooth movement to target position
        this.carPosition.x += (targetX - this.carPosition.x) * 0.1;
        this.updateCarPosition();
    }

    updateCarPosition() {
        this.playerCar.style.left = this.carPosition.x + 'px';
        this.playerCar.style.bottom = '15vh';
    }

    spawnItems() {
        if (!this.gameRunning) return;

        // Adjust spawn probabilities based on speed level
        const speedObstacleChance = {
            1: 0.15,  // Very slow - fewer obstacles
            2: 0.25,  // Slow
            3: 0.4,   // Medium - original
            4: 0.5,   // Fast - more obstacles
            5: 0.6    // Very fast - many obstacles
        };

        const speedStarChance = {
            1: 0.5,   // Very slow - fewer stars to manage
            2: 0.6,   // Slow
            3: 0.7,   // Medium - original
            4: 0.8,   // Fast - more typing practice
            5: 0.9    // Very fast - lots of typing practice
        };

        // Spawn obstacles
        if (Math.random() < speedObstacleChance[this.speedLevel]) {
            this.createObstacle();
        }

        // Spawn stars frequently for typing practice
        if (Math.random() < speedStarChance[this.speedLevel]) {
            this.createStar();
        }

        // Adjust spawn rate based on speed level and time progression
        const timeProgress = 1 - (this.timeRemaining / this.gameTimeMs);
        const baseSpawnDelay = 2000;

        // Speed level affects base spawn rate
        const speedDelayMultiplier = {
            1: 1.8,  // Very slow - more time between spawns
            2: 1.4,  // Slow
            3: 1.0,  // Medium - original timing
            4: 0.8,  // Fast - faster spawns
            5: 0.6   // Very fast - much faster spawns
        };

        const adjustedDelay = baseSpawnDelay * speedDelayMultiplier[this.speedLevel];
        const spawnDelay = Math.max(600, adjustedDelay - (timeProgress * 800));

        setTimeout(() => this.spawnItems(), spawnDelay);
    }

    createObstacle() {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        obstacle.innerHTML = '🚙';

        // Place in one of three lanes
        const lane = Math.floor(Math.random() * 3);
        const x = this.roadLeft + (lane + 0.5) * (this.roadWidth / 3) - 25;

        obstacle.style.left = x + 'px';
        obstacle.style.top = '-50px';
        obstacle.dataset.lane = lane;

        this.gameArea.appendChild(obstacle);
        this.obstacles.push(obstacle);
    }

    createStar() {
        const star = document.createElement('div');
        star.className = 'star';

        // Random number 0-9
        const number = Math.floor(Math.random() * 10);
        star.innerHTML = `⭐${number}`;
        star.dataset.number = number;
        star.dataset.collected = 'false';

        // Place randomly within the road
        const x = this.roadLeft + Math.random() * (this.roadWidth - 50);
        star.style.left = x + 'px';
        star.style.top = '-50px';

        this.gameArea.appendChild(star);
        this.stars.push(star);
    }

    updateObstacles() {
        this.obstacles.forEach((obstacle, index) => {
            const currentTop = parseInt(obstacle.style.top) || 0;
            const newTop = currentTop + this.gameSpeed;

            if (newTop > this.gameHeight) {
                obstacle.remove();
                this.obstacles.splice(index, 1);
            } else {
                obstacle.style.top = newTop + 'px';
            }
        });
    }

    updateStars() {
        this.stars.forEach((star, index) => {
            const currentTop = parseInt(star.style.top) || 0;
            const newTop = currentTop + this.gameSpeed;

            if (newTop > this.gameHeight) {
                star.remove();
                this.stars.splice(index, 1);
            } else {
                star.style.top = newTop + 'px';
            }
        });
    }

    tryCollectStar(keyPressed) {
        this.stars.forEach((star, index) => {
            if (star.dataset.collected === 'true') return;

            const starNumber = star.dataset.number;
            const starRect = this.getElementRect(star);

            // Check if star is in collection zone and matches the key
            const collectionZoneTop = this.gameHeight * 0.4; // 40% from top
            const collectionZoneBottom = this.gameHeight * 0.8; // 80% from top
            if (starNumber == keyPressed && starRect.top > collectionZoneTop && starRect.top < collectionZoneBottom) {
                this.collectStar(star, index);
            }
        });
    }

    dodge(key) {
        if (this.dodging) return;

        let newLane = this.carLane;
        switch(key) {
            case 'a': // Left
                newLane = Math.max(0, this.carLane - 1);
                break;
            case 's': // Stay/brake (keep current lane but signal dodge)
                break;
            case 'd': // Right
                newLane = Math.min(2, this.carLane + 1);
                break;
        }

        this.carLane = newLane;
        this.dodging = true;
        this.dodgeStartTime = Date.now();

        // Visual feedback
        this.showCelebration('Dodge!', 300);

        if (window.soundManager) {
            window.soundManager.play('engine');
        }
    }

    checkCollisions() {
        const carRect = this.getElementRect(this.playerCar);

        // Check obstacle collisions only when not dodging
        if (!this.dodging) {
            this.obstacles.forEach((obstacle, index) => {
                const obstacleRect = this.getElementRect(obstacle);
                const obstacleLane = parseInt(obstacle.dataset.lane);

                // Check if obstacle is in same lane and close enough
                if (obstacleLane === this.carLane && this.isColliding(carRect, obstacleRect)) {
                    this.handleObstacleCollision(obstacle, index);
                }
            });
        }
    }

    getElementRect(element) {
        const rect = element.getBoundingClientRect();
        const gameRect = this.gameArea.getBoundingClientRect();

        return {
            left: rect.left - gameRect.left,
            top: rect.top - gameRect.top,
            right: rect.right - gameRect.left,
            bottom: rect.bottom - gameRect.top,
            width: rect.width,
            height: rect.height
        };
    }

    isColliding(rect1, rect2) {
        return !(rect1.right < rect2.left ||
                rect1.left > rect2.right ||
                rect1.bottom < rect2.top ||
                rect1.top > rect2.bottom);
    }

    collectStar(star, index) {
        star.dataset.collected = 'true';
        star.style.transform = 'scale(1.5)';
        star.style.opacity = '0.5';

        this.score += 1;
        this.showCelebration(`+1 Star! 🌟`, 800);

        if (window.soundManager) {
            window.soundManager.play('star');
        }

        setTimeout(() => {
            if (star.parentNode) {
                star.remove();
            }
            const starIndex = this.stars.indexOf(star);
            if (starIndex > -1) {
                this.stars.splice(starIndex, 1);
            }
        }, 200);
    }

    handleObstacleCollision(obstacle, index) {
        obstacle.remove();
        this.obstacles.splice(index, 1);

        // Penalty: lose 1 star
        this.score = Math.max(0, this.score - 1);
        this.showCelebration('Collision! -1 Star 💥', 1000);

        if (window.soundManager) {
            window.soundManager.play('obstacle');
        }
    }

    showCelebration(message, duration = 1000) {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        celebration.innerHTML = message;
        celebration.style.fontSize = '2em';
        this.gameArea.appendChild(celebration);

        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.remove();
            }
        }, duration);
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    endGame() {
        this.gameRunning = false;
        this.finalScore.textContent = this.score;

        // Performance message based on score
        let message = "Great job!";
        if (this.score >= 50) {
            message = "🌟 Amazing! You're a typing champion! 🌟";
        } else if (this.score >= 30) {
            message = "🚗 Excellent driving and typing! 🚗";
        } else if (this.score >= 15) {
            message = "👍 Good job! Keep practicing! 👍";
        } else if (this.score >= 5) {
            message = "🎯 Nice try! You're getting better! 🎯";
        } else {
            message = "🌈 Keep practicing - you'll improve! 🌈";
        }

        this.performanceMessage.textContent = message;
        this.gameOver.style.display = 'block';

        // Clear all game objects
        this.obstacles.forEach(obstacle => obstacle.remove());
        this.stars.forEach(star => star.remove());
        this.obstacles = [];
        this.stars = [];
    }

    toggleSound() {
        if (window.soundManager) {
            window.soundManager.toggle();
            this.soundToggle.textContent = window.soundManager.enabled ? '🔊' : '🔇';
        }
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RacingTutorGame();
});
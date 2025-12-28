class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.sounds = {};
        this.letterSounds = {};
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.warn('Web Audio API not supported, sounds disabled');
            this.enabled = false;
        }
    }

    createSounds() {
        this.sounds.collect = this.createTone(800, 0.1, 'sine');
        this.sounds.collision = this.createTone(200, 0.3, 'sawtooth');
        this.sounds.levelUp = this.createMelody([523, 659, 784], 0.2);
        this.sounds.gameOver = this.createMelody([440, 370, 330], 0.4);

        this.createLetterSounds();
    }

    createLetterSounds() {
        const letterFrequencies = {
            'a': 440, 'b': 466, 'c': 493, 'd': 523, 'e': 554,
            'f': 587, 'g': 622, 'h': 659, 'i': 698, 'j': 740,
            'k': 784, 'l': 831, 'm': 880, 'n': 932, 'o': 988,
            'p': 1047, 'q': 1109, 'r': 1175, 's': 1245, 't': 1319,
            'u': 1397, 'v': 1480, 'w': 1568, 'x': 1661, 'y': 1760, 'z': 1865
        };

        for (const letter in letterFrequencies) {
            this.letterSounds[letter] = this.createLetterTone(letterFrequencies[letter], letter);
        }
    }

    createTone(frequency, duration, type = 'sine') {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    createLetterTone(baseFrequency, letter) {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();

            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(baseFrequency, this.audioContext.currentTime);
            oscillator.type = 'triangle';

            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(baseFrequency * 2, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

            oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.8, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);

            setTimeout(() => {
                this.speakLetter(letter);
            }, 100);
        };
    }

    createMelody(frequencies, noteDuration) {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            frequencies.forEach((frequency, index) => {
                const startTime = this.audioContext.currentTime + (index * noteDuration);
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, startTime);
                oscillator.type = 'triangle';

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

                oscillator.start(startTime);
                oscillator.stop(startTime + noteDuration);
            });
        };
    }

    speakLetter(letter) {
        if (!this.enabled || typeof speechSynthesis === 'undefined') return;

        const utterance = new SpeechSynthesisUtterance(letter.toLowerCase());
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        utterance.volume = 0.6;

        const voices = speechSynthesis.getVoices();
        const childVoice = voices.find(voice =>
            voice.name.includes('child') ||
            voice.name.includes('kid') ||
            voice.name.includes('Google UK English Female') ||
            voice.name.includes('Microsoft Zira')
        );

        if (childVoice) {
            utterance.voice = childVoice;
        } else if (voices.length > 0) {
            const femaleVoice = voices.find(voice => voice.name.includes('Female'));
            if (femaleVoice) utterance.voice = femaleVoice;
        }

        speechSynthesis.speak(utterance);
    }

    playCollectSound() {
        if (this.sounds.collect) {
            this.sounds.collect();
        }
    }

    playLetterSound(letter) {
        if (this.letterSounds[letter]) {
            this.letterSounds[letter]();
        }
    }

    playCollisionSound() {
        if (this.sounds.collision) {
            this.sounds.collision();
        }
    }

    playLevelUpSound() {
        if (this.sounds.levelUp) {
            this.sounds.levelUp();
        }
    }

    playGameOverSound() {
        if (this.sounds.gameOver) {
            this.sounds.gameOver();
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;

        if (enabled && !this.audioContext) {
            this.init();
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume();
        }
        return Promise.resolve();
    }
}

document.addEventListener('click', () => {
    if (window.soundManager) {
        window.soundManager.resume();
    }
}, { once: true });

if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {
        console.log('Speech synthesis voices loaded');
    };
}
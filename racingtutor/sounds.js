class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.initAudio();
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.log('Audio not supported, running in silent mode');
            this.enabled = false;
        }
    }

    createSounds() {
        // Create simple beep sounds for different events
        this.sounds.star = this.createBeep(800, 0.1, 'sine');
        this.sounds.obstacle = this.createBeep(200, 0.2, 'sawtooth');
        this.sounds.engine = this.createBeep(100, 0.1, 'triangle');
    }

    createBeep(frequency, duration, waveType = 'sine') {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = waveType;

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}

// Make it globally available
window.soundManager = new SoundManager();
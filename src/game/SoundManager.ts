export class SoundManager {
    private masterVolume: number = 1.0;
    private audioContext: AudioContext | null = null;
    private soundCache: Map<string, ArrayBuffer> = new Map();
    private playingSounds: Set<AudioBufferSourceNode> = new Set();

    constructor() {
        // Initialize audio context on first user interaction
        this.initAudioContext();
    }

    private async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('AudioContext not supported');
        }
    }

    setMasterVolume(volume: number) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        // Store in localStorage
        localStorage.setItem('masterVolume', this.masterVolume.toString());
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    async loadSound(path: string): Promise<ArrayBuffer> {
        if (this.soundCache.has(path)) {
            return this.soundCache.get(path)!;
        }

        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            const arrayBuffer = await response.arrayBuffer();
            this.soundCache.set(path, arrayBuffer);
            return arrayBuffer;
        } catch (error) {
            console.error(`Error loading sound ${path}:`, error);
            throw error;
        }
    }

    async playSound(path: string, volume: number = 1.0, pitch: number = 1.0, maxDuration?: number): Promise<void> {
        if (!this.audioContext) {
            await this.initAudioContext();
            if (!this.audioContext) return; 
        }

        // Resume audio context if suspended (required by browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        try {
            const arrayBuffer = await this.loadSound(path);
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            source.playbackRate.value = pitch;
            gainNode.gain.value = volume * this.masterVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.onended = () => {
                this.playingSounds.delete(source);
            };
            
            this.playingSounds.add(source);
            source.start(0);
            
            // Stop sound after maxDuration if specified
            if (maxDuration !== undefined) {
                setTimeout(() => {
                    try {
                        source.stop();
                        this.playingSounds.delete(source);
                    } catch (e) {
                        // Sound may have already ended, ignore error
                    }
                }, maxDuration);
            }
        } catch (error) {
            console.error(`Error playing sound ${path}:`, error);
        }
    }

    // Helper to get sound URL
    // In production, sound_assets is in the public folder, so use relative path from root
    private getSoundUrl(path: string): string {
        // Path should be relative to public folder (e.g., 'AUDIO/Swoosh/file.wav')
        // Since base is './', prepend 'sound_assets/' to get the correct path
        return `sound_assets/${path}`;
    }

    // Convenience methods for common sounds
    playShoot(volume: number = 0.3) {
        const sounds = [
            this.getSoundUrl('AUDIO/Swoosh/SFX_Movement_Swoosh_Fast_1.wav'),
            this.getSoundUrl('AUDIO/Swoosh/SFX_Movement_Swoosh_Fast_2.wav'),
            this.getSoundUrl('AUDIO/Swoosh/SFX_Movement_Swoosh_Fast_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 1.2);
    }

    playEnemyDeath(volume: number = 0.26) {
        const sounds = [
            this.getSoundUrl('AUDIO/Eat_Bite/SFX_Eat_Bite_1.wav'),
            this.getSoundUrl('AUDIO/Eat_Bite/SFX_Eat_Bite_2.wav'),
            this.getSoundUrl('AUDIO/Eat_Bite/SFX_Eat_Bite_3.wav'),
            this.getSoundUrl('AUDIO/Eat_Bite/SFX_Eat_Bite_4.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume);
    }

    playXPCollect(volume: number = 0.3) {
        const sounds = [
            this.getSoundUrl('AUDIO/Collect/Coin/SFX_Player_Collect_Coin_1.wav'),
            this.getSoundUrl('AUDIO/Collect/Coin/SFX_Player_Collect_Coin_2.wav'),
            this.getSoundUrl('AUDIO/Collect/Coin/SFX_Player_Collect_Coin_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 1.1);
    }

    playChestOpen(rarity: 'common' | 'rare' | 'legendary' = 'common', volume: number = 0.5) {
        let sound: string;
        if (rarity === 'legendary') {
            sound = this.getSoundUrl('AUDIO/Chest_Open/SFX_Chest_Open_Rich_1.wav');
        } else if (rarity === 'rare') {
            sound = this.getSoundUrl('AUDIO/Chest_Open/SFX_Chest_Open_1.wav');
        } else {
            sound = this.getSoundUrl('AUDIO/Chest_Open/SFX_Chest_Open_Plain_1.wav');
        }
        this.playSound(sound, volume);
    }

    playExplosion(volume: number = 0.25) {
        const sounds = [
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_1.wav'),
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_2.wav'),
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        // Play at lower volume and cut off after 100ms
        this.playSound(sound, volume, 0.8, 100);
    }

    playLevelUp(volume: number = 0.6) {
        this.playSound(this.getSoundUrl('AUDIO/Chimes/SFX_Chimes_Glowing_Stars_1.wav'), volume);
    }

    playPowerup(volume: number = 0.5) {
        const sounds = [
            this.getSoundUrl('AUDIO/Powerup/SFX_Powerup_Potion_1.wav'),
            this.getSoundUrl('AUDIO/Powerup/SFX_Powerup_Crystal_1.wav'),
            this.getSoundUrl('AUDIO/Powerup/SFX_Powerup_Bright_1.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume);
    }

    playPlayerDamage(volume: number = 0.3) {
        const sounds = [
            this.getSoundUrl('AUDIO/Rattle/Metal/SFX_Rattle_Metal_Single_1.wav'),
            this.getSoundUrl('AUDIO/Rattle/Metal/SFX_Rattle_Metal_Single_2.wav'),
            this.getSoundUrl('AUDIO/Rattle/Metal/SFX_Rattle_Metal_Single_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 1.3);
    }

    playMinigameStart(volume: number = 0.4) {
        this.playSound(this.getSoundUrl('AUDIO/Spin_Wheel/SFX_SpinWheel_Start_1.wav'), volume);
    }

    playMinigameLoop(volume: number = 0.2): AudioBufferSourceNode | null {
        if (!this.audioContext) return null;
        
        const path = this.getSoundUrl('AUDIO/Spin_Wheel/SFX_SpinWheel_Fast_Loop_1.wav');
        // For looping sounds, we'd need to handle them differently
        // For now, just play once
        this.playSound(path, volume);
        return null;
    }

    playBossFightEntry(volume: number = 0.6) {
        // Use a dramatic sound - maybe explosion or chimes
        this.playSound(this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_1.wav'), volume, 0.6);
    }

    playVictory(volume: number = 0.7) {
        const sounds = [
            this.getSoundUrl('AUDIO/Confetti/SFX_Confetti_Explosion_Bright_1.wav'),
            this.getSoundUrl('AUDIO/Confetti/SFX_Confetti_Explosion_Bright_2.wav'),
            this.getSoundUrl('AUDIO/Confetti/SFX_Confetti_Explosion_Bright_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume);
    }

    playUIClick(volume: number = 0.2) {
        // Use cash register or pop sound for UI
        this.playSound(this.getSoundUrl('AUDIO/Cash_Register/SFX_Cash_Register_Buy_Click_1.wav'), volume, 1.2);
    }

    playVolumeTest(volume: number = 0.15) {
        // Use a subtle pop sound for volume testing
        const sounds = [
            this.getSoundUrl('AUDIO/Pop/Liquid/SFX_Pop_Liquid_1.wav'),
            this.getSoundUrl('AUDIO/Pop/Liquid/SFX_Pop_Liquid_2.wav'),
            this.getSoundUrl('AUDIO/Pop/Liquid/SFX_Pop_Liquid_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 1.0);
    }

    playDeath(volume: number = 0.5) {
        // Use a dramatic sound for death - maybe a low explosion or rattle
        const sounds = [
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_1.wav'),
            this.getSoundUrl('AUDIO/Rattle/Metal/SFX_Rattle_Metal_1.wav'),
            this.getSoundUrl('AUDIO/Rattle/Metal/SFX_Rattle_Metal_2.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 0.7);
    }

    playMinigameBounceLeft(volume: number = 0.2) {
        // First click sound for left side (metronome tick)
        this.playSound(
            this.getSoundUrl('AUDIO/Pop/Liquid/SFX_Pop_Liquid_1.wav'),
            volume,
            1.5
        );
    }

    playMinigameBounceRight(volume: number = 0.2) {
        // Second click sound for right side (metronome tock)
        this.playSound(
            this.getSoundUrl('AUDIO/Pop/Liquid/SFX_Pop_Liquid_2.wav'),
            volume,
            1.5
        );
    }

    // Load volume from localStorage on init
    loadSettings() {
        const saved = localStorage.getItem('masterVolume');
        if (saved !== null) {
            this.masterVolume = parseFloat(saved);
        }
    }
}


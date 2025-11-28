// Music track configuration - easily extensible for future tracks
export const MUSIC_TRACKS = {
    NORMAL: 'Tidal Waves.mp3',  // Default normal gameplay music
    BOSS: 'kraken-boss-music.mp3',            // Kraken boss fight music
} as const;

// Available music tracks in music-tracks folder (update this list when adding new tracks)
export const AVAILABLE_MUSIC_TRACKS = [
    'Tidal Waves.mp3',
    'Aquatic Pulse.mp3',
    'Seashells & Squids.mp3',
    'Abyssal Drift.mp3',
    'Sunken Dreams.mp3',
] as const;

export class SoundManager {
    private masterVolume: number = 0.5; // Default master volume (50%)
    private ambientSoundEnabled: boolean = true;
    private audioContext: AudioContext | null = null;
    private soundCache: Map<string, ArrayBuffer> = new Map();
    private playingSounds: Set<AudioBufferSourceNode> = new Set();
    private ambientSoundSource: AudioBufferSourceNode | null = null;
    private ambientGainNode: GainNode | null = null;
    private lastExplosionSoundTime: number = 0;
    private explosionSoundCooldown: number = 200; // milliseconds
    
    // Music system
    private musicVolume: number = 0.25; // Default music volume (25%)
    private musicEnabled: boolean = true;
    private musicSource: AudioBufferSourceNode | null = null;
    private musicGainNode: GainNode | null = null;
    private currentMusicTrack: string | null = null;
    private selectedMusicTrack: string = MUSIC_TRACKS.NORMAL; // User-selected track (for manual selection)
    private loopTrack: boolean = false; // Loop current track (default OFF)
    private currentTrackIndex: number = 0; // Current index in AVAILABLE_MUSIC_TRACKS for sequential playback
    private allMusicSources: Set<AudioBufferSourceNode> = new Set(); // Track ALL music sources
    private onMusicTrackChanged: ((track: string | null) => void) | null = null; // Callback when music track changes

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
        // Update ambient sound volume
        this.updateAmbientVolume();
        // Update music volume
        this.updateMusicVolume();
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

    playExplosion(volume: number = 0.30) {
        // Throttle explosion sounds to prevent audio spam (especially during kraken fights)
        const now = performance.now();
        if (now - this.lastExplosionSoundTime < this.explosionSoundCooldown) {
            return; // Skip playing sound if cooldown hasn't elapsed
        }
        
        this.lastExplosionSoundTime = now;
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
    
    playSonarPing(volume: number = 0.5) {
        // Play a ping-like sound for sonar pulse
        this.playSound(this.getSoundUrl('AUDIO/Custom/sonar-ping-290188.mp3'), volume, 1.0);
    }

    playWaterSplash(volume: number = 0.4) {
        this.playSound(this.getSoundUrl('AUDIO/Custom/water-splash-199583.mp3'), volume, 1.0);
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
    
    playMedkitPickup(volume: number = 0.4) {
        // Always play the same unique sound for medkit pickup
        this.playSound(this.getSoundUrl('AUDIO/Powerup/SFX_Powerup_Potion_1.wav'), volume, 1.0);
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
    
    playKrakenRoar(volume: number = 0.7, isEntry: boolean = false) {
        // Use the actual kraken roar sounds
        if (isEntry) {
            // Entry roar when first entering the fight
            this.playSound(this.getSoundUrl('AUDIO/Custom/kraken entry roar.mp3'), volume, 1.0);
        } else {
            // Phase change roar
            this.playSound(this.getSoundUrl('AUDIO/Custom/kraken roar phase change.mp3'), volume, 1.0);
        }
    }

    playVictory(volume: number = 0.8) {
        // Use success bright rich sound for victory
        this.playSound(this.getSoundUrl('AUDIO/UI/Success/SFX_UI_Success_Bright_Rich_1.wav'), volume);
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

    playDeath(volume: number = 0.6) {
        // Use a dramatic explosion sound for death
        const sounds = [
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_1.wav'),
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_2.wav'),
            this.getSoundUrl('AUDIO/Firework/SFX_Firework_Explosion_3.wav'),
        ];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        this.playSound(sound, volume, 0.9);
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

    async playAmbientLoop(volume: number = 0.24375) {
        if (!this.audioContext) {
            await this.initAudioContext();
            if (!this.audioContext) return;
        }

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Stop existing ambient sound if playing
        if (this.ambientSoundSource) {
            try {
                this.ambientSoundSource.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            this.ambientSoundSource = null;
        }

        try {
            const path = this.getSoundUrl('AUDIO/Custom/underwater-ambiencewav-14428.mp3');
            const arrayBuffer = await this.loadSound(path);
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            const playLoop = () => {
                if (!this.audioContext) return;
                
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                
                source.buffer = audioBuffer;
                source.loop = true;
                gainNode.gain.value = volume * this.masterVolume;
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.onended = () => {
                    // Restart loop if it ends (shouldn't happen with loop=true, but safety)
                    if (this.ambientSoundSource === source) {
                        playLoop();
                    }
                };
                
                this.ambientSoundSource = source;
                this.ambientGainNode = gainNode;
                source.start(0);
            };
            
            playLoop();
        } catch (error) {
            console.error(`Error playing ambient sound:`, error);
        }
    }

    stopAmbientLoop() {
        if (this.ambientSoundSource) {
            try {
                this.ambientSoundSource.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            this.ambientSoundSource = null;
            this.ambientGainNode = null;
        }
    }

    // Update ambient volume when master volume changes
    updateAmbientVolume() {
        if (this.ambientGainNode) {
            // Set to 0 if disabled, otherwise 19.5% of master volume (30% increase from 15%)
            const baseVolume = this.ambientSoundEnabled ? 0.24375 : 0;
            this.ambientGainNode.gain.value = baseVolume * this.masterVolume;
        }
    }

    getAmbientSoundEnabled(): boolean {
        return this.ambientSoundEnabled;
    }

    setAmbientSoundEnabled(enabled: boolean) {
        this.ambientSoundEnabled = enabled;
        // Store in localStorage
        localStorage.setItem('ambientSoundEnabled', enabled.toString());
        // Update ambient sound volume immediately
        this.updateAmbientVolume();
    }

    // Music system methods
    setMusicVolume(volume: number) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('musicVolume', this.musicVolume.toString());
        this.updateMusicVolume();
    }

    getMusicVolume(): number {
        return this.musicVolume;
    }

    setMusicEnabled(enabled: boolean) {
        this.musicEnabled = enabled;
        localStorage.setItem('musicEnabled', enabled.toString());
        if (!enabled) {
            // Stop music but preserve track name so we can restart it later
            if (this.musicSource) {
                try {
                    this.musicSource.stop();
                } catch (e) {
                    // Ignore if already stopped
                }
                this.musicSource = null;
                this.musicGainNode = null;
            }
        } else {
            // Music re-enabled - restart the current track if we have one, or start sequence
            if (this.currentMusicTrack && this.currentMusicTrack !== MUSIC_TRACKS.BOSS) {
                this.playMusic(this.currentMusicTrack);
            } else if (!this.currentMusicTrack || this.currentMusicTrack === MUSIC_TRACKS.BOSS) {
                // Start from current position in sequence
                const trackToPlay = AVAILABLE_MUSIC_TRACKS[this.currentTrackIndex] || AVAILABLE_MUSIC_TRACKS[0];
                this.playMusic(trackToPlay);
            }
        }
        this.updateMusicVolume();
    }

    getMusicEnabled(): boolean {
        return this.musicEnabled;
    }

    setSelectedMusicTrack(trackName: string) {
        this.selectedMusicTrack = trackName;
        localStorage.setItem('selectedMusicTrack', trackName);
        // Update current track index
        const index = AVAILABLE_MUSIC_TRACKS.indexOf(trackName as any);
        if (index !== -1) {
            this.currentTrackIndex = index;
        }
        // Restart music if it's currently playing and we're not in boss fight
        if (this.musicEnabled && this.currentMusicTrack && this.currentMusicTrack !== MUSIC_TRACKS.BOSS) {
            this.playMusic(trackName);
        }
    }

    getSelectedMusicTrack(): string {
        return this.selectedMusicTrack;
    }
    
    getCurrentMusicTrack(): string | null {
        // Return the currently playing track (not the selected one)
        // If boss music is playing, return null (don't show boss music in dropdown)
        if (this.currentMusicTrack === MUSIC_TRACKS.BOSS) {
            return null;
        }
        return this.currentMusicTrack;
    }
    
    setOnMusicTrackChanged(callback: ((track: string | null) => void) | null) {
        this.onMusicTrackChanged = callback;
    }

    setLoopTrack(enabled: boolean) {
        this.loopTrack = enabled;
        localStorage.setItem('loopTrack', enabled.toString());
        // If currently playing a normal track, update loop behavior
        if (this.musicSource && this.currentMusicTrack && this.currentMusicTrack !== MUSIC_TRACKS.BOSS) {
            // Restart current track with new loop setting
            this.playMusic(this.currentMusicTrack);
        }
    }

    getLoopTrack(): boolean {
        return this.loopTrack;
    }

    async playNextTrackInSequence() {
        // Find current track index
        const currentIndex = AVAILABLE_MUSIC_TRACKS.indexOf(this.currentMusicTrack as any);
        if (currentIndex === -1) {
            // Current track not in list, start from beginning
            this.currentTrackIndex = 0;
        } else {
            // Move to next track
            this.currentTrackIndex = (currentIndex + 1) % AVAILABLE_MUSIC_TRACKS.length;
        }
        
        const nextTrack = AVAILABLE_MUSIC_TRACKS[this.currentTrackIndex];
        this.selectedMusicTrack = nextTrack;
        await this.playMusic(nextTrack);
    }

    async playMusic(trackName: string) {
        if (!this.musicEnabled) return;
        
        // If we're switching FROM boss music TO normal music, use stopBossMusic
        if (this.currentMusicTrack === MUSIC_TRACKS.BOSS && trackName !== MUSIC_TRACKS.BOSS) {
            this.stopBossMusic();
        } else {
            // Stop current music if playing
            this.stopMusic();
        }
        
        // Update current track index if this is a normal track
        if (trackName !== MUSIC_TRACKS.BOSS) {
            const index = AVAILABLE_MUSIC_TRACKS.indexOf(trackName as any);
            if (index !== -1) {
                this.currentTrackIndex = index;
            }
        }
        
        if (!this.audioContext) {
            await this.initAudioContext();
            if (!this.audioContext) return;
        }

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        try {
            // Determine path based on track type (boss music vs normal music)
            let path: string;
            if (trackName === MUSIC_TRACKS.BOSS) {
                // Boss music is in Custom folder
                path = this.getSoundUrl(`AUDIO/Custom/${trackName}`);
            } else {
                // Normal music tracks are in music-tracks folder
                path = this.getSoundUrl(`AUDIO/Custom/music-tracks/${trackName}`);
            }
            const arrayBuffer = await this.loadSound(path);
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            const playTrack = () => {
                if (!this.audioContext || !this.musicEnabled) return;
                
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                
                source.buffer = audioBuffer;
                // Only loop if loopTrack is enabled AND we're not in boss fight
                source.loop = this.loopTrack && trackName !== MUSIC_TRACKS.BOSS;
                gainNode.gain.value = this.musicVolume * this.masterVolume;
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.onended = () => {
                    // Remove from tracking set when source ends
                    this.allMusicSources.delete(source);
                    if (this.musicSource === source && this.musicEnabled) {
                        // If looping is enabled, restart this track
                        if (this.loopTrack && trackName !== MUSIC_TRACKS.BOSS) {
                            playTrack();
                        } else if (trackName !== MUSIC_TRACKS.BOSS) {
                            // Not looping - play next track in sequence
                            this.playNextTrackInSequence();
                        }
                    }
                };
                
                this.musicSource = source;
                this.musicGainNode = gainNode;
                this.currentMusicTrack = trackName;
                // Track this source
                this.allMusicSources.add(source);
                // Notify callback if track changed (only for non-boss music)
                if (this.onMusicTrackChanged && trackName !== MUSIC_TRACKS.BOSS) {
                    this.onMusicTrackChanged(trackName);
                }
                source.start(0);
            };
            
            playTrack();
        } catch (error) {
            console.error(`Error playing music ${trackName}:`, error);
        }
    }

    stopMusic() {
        if (this.musicSource) {
            try {
                // Remove from tracking set
                this.allMusicSources.delete(this.musicSource);
                // Disconnect nodes first
                if (this.musicGainNode) {
                    this.musicGainNode.disconnect();
                }
                this.musicSource.disconnect();
                // Clear callback
                this.musicSource.onended = null;
                // Stop the source
                this.musicSource.stop();
            } catch (e) {
                // Ignore if already stopped or disconnected
            }
            this.musicSource = null;
            this.musicGainNode = null;
            // Don't clear currentMusicTrack - we want to preserve it so we can restart later
        }
    }
    
    stopBossMusic() {
        // NUCLEAR OPTION: Stop ALL music sources, not just the current one
        // This ensures boss music stops even if there are multiple sources or state issues
        
        // Stop and disconnect ALL tracked music sources
        this.allMusicSources.forEach(source => {
            try {
                source.onended = null; // Clear callback
                source.stop(); // Stop playback
                source.disconnect(); // Disconnect from audio graph
            } catch (e) {
                // Ignore errors - source might already be stopped
            }
        });
        this.allMusicSources.clear();
        
        // Also handle the current music source
        if (this.musicSource) {
            try {
                // First, mute the gain node immediately to stop audio output
                if (this.musicGainNode) {
                    this.musicGainNode.gain.setValueAtTime(0, this.audioContext?.currentTime || 0);
                    this.musicGainNode.disconnect();
                }
                // Clear callback before stopping
                this.musicSource.onended = null;
                // Stop the source
                this.musicSource.stop();
                // Disconnect the source
                this.musicSource.disconnect();
            } catch (e) {
                // Ignore errors - source might already be stopped
            }
            this.musicSource = null;
            this.musicGainNode = null;
        }
        
        // Always clear boss music state
        this.currentMusicTrack = null; // Clear ALL music state, not just boss
    }

    updateMusicVolume() {
        if (this.musicGainNode) {
            const baseVolume = this.musicEnabled ? this.musicVolume : 0;
            this.musicGainNode.gain.value = baseVolume * this.masterVolume;
        }
    }

    // Load volume from localStorage on init
    loadSettings() {
        const saved = localStorage.getItem('masterVolume');
        if (saved !== null) {
            this.masterVolume = parseFloat(saved);
        }
        
        const savedAmbient = localStorage.getItem('ambientSoundEnabled');
        if (savedAmbient !== null) {
            this.ambientSoundEnabled = savedAmbient === 'true';
        }
        
        const savedMusicVolume = localStorage.getItem('musicVolume');
        if (savedMusicVolume !== null) {
            this.musicVolume = parseFloat(savedMusicVolume);
        }
        
        const savedMusicEnabled = localStorage.getItem('musicEnabled');
        if (savedMusicEnabled !== null) {
            this.musicEnabled = savedMusicEnabled === 'true';
        }
        
        const savedSelectedTrack = localStorage.getItem('selectedMusicTrack');
        if (savedSelectedTrack !== null) {
            this.selectedMusicTrack = savedSelectedTrack;
            // Update current track index
            const index = AVAILABLE_MUSIC_TRACKS.indexOf(savedSelectedTrack as any);
            if (index !== -1) {
                this.currentTrackIndex = index;
            }
        } else {
            // Default to first track (Tidal Waves)
            this.currentTrackIndex = 0;
            this.selectedMusicTrack = AVAILABLE_MUSIC_TRACKS[0];
        }
        
        const savedLoopTrack = localStorage.getItem('loopTrack');
        if (savedLoopTrack !== null) {
            this.loopTrack = savedLoopTrack === 'true';
        }
    }
}


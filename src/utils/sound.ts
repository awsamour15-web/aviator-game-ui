/**
 * Web Audio API synthesizer for the Aviator game
 * Works without external assets, zero latency, guaranteed to play
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Read mute preference from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aviator_muted');
      if (stored !== null) {
        this.isMuted = stored === 'true';
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aviator_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.stopFlightEngine();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Short countdown beep
  public playCountdownBeep(isFinal = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinal ? 'square' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 540, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isFinal ? 0.25 : 0.12));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (isFinal ? 0.25 : 0.12));
    } catch {
      // Audio autoplay policy catch
    }
  }

  // Jet Engine Drone during flight - pitch modulates with multiplier
  public startFlightEngine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopFlightEngine();

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(140, this.ctx.currentTime);

      // Low pass filter for warm turbine sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.engineGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.3);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    } catch {
      // Audio catch
    }
  }

  public updateEnginePitch(multiplier: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc) return;
    try {
      // Pitch goes up smoothly with multiplier
      const basePitch = 140;
      const targetFreq = Math.min(800, basePitch + (multiplier - 1.0) * 45);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    } catch {
      // Catch
    }
  }

  public stopFlightEngine() {
    if (this.engineOsc && this.ctx) {
      try {
        if (this.engineGain) {
          this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        }
        setTimeout(() => {
          this.engineOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineOsc = null;
          this.engineGain = null;
        }, 120);
      } catch {
        this.engineOsc = null;
        this.engineGain = null;
      }
    }
  }

  // Cashout success chime
  public playCashoutChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      frequencies.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.05);

        gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.05);
        osc.stop(this.ctx!.currentTime + idx * 0.05 + 0.4);
      });
    } catch {
      // Audio catch
    }
  }

  // Crash / Flew Away sound
  public playCrashSound() {
    this.stopFlightEngine();
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // Low bass drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {
      // Audio catch
    }
  }
}

export const sounds = new SoundEngine();

const MUTE_KEY = 'fourcups.muted'

type SfxName = 'hover' | 'pick' | 'transition' | 'number' | 'reveal' | 'swish'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      this.muted = false
    }
  }

  isMuted() {
    return this.muted
  }

  setMuted(flag: boolean) {
    this.muted = flag
    try {
      localStorage.setItem(MUTE_KEY, flag ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  toggle() {
    this.setMuted(!this.muted)
    return this.muted
  }

  /** Must be called from a user gesture to unlock audio on mobile. */
  unlock() {
    if (!this.ctx) {
      const Ctor = (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private blip(freq: number, dur = 0.18, type: OscillatorType = 'sine', vol = 0.2, when = 0) {
    if (this.muted || !this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  play(name: SfxName) {
    this.unlock()
    if (!this.ctx) return
    switch (name) {
      case 'hover':
        this.blip(660, 0.05, 'sine', 0.05)
        break
      case 'pick':
        this.blip(520, 0.12, 'triangle', 0.22)
        this.blip(780, 0.16, 'triangle', 0.18, 0.09)
        break
      case 'transition':
        this.blip(440, 0.1, 'sine', 0.15)
        this.blip(554, 0.12, 'sine', 0.14, 0.08)
        this.blip(659, 0.14, 'sine', 0.13, 0.16)
        break
      case 'number':
        this.blip(392, 0.12, 'sine', 0.2)
        this.blip(523, 0.14, 'sine', 0.18, 0.1)
        break
      case 'reveal':
        this.blip(261, 0.3, 'sine', 0.18)
        this.blip(392, 0.3, 'sine', 0.16, 0.2)
        this.blip(523, 0.5, 'sine', 0.16, 0.42)
        this.blip(659, 0.8, 'sine', 0.14, 0.66)
        break
      case 'swish':
        this.blip(720, 0.05, 'triangle', 0.06)
        break
    }
  }
}

export const sfx = new SoundEngine()
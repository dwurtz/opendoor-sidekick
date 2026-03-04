/**
 * Plays back PCM16 audio from base64 chunks via Web Audio API.
 * Handles buffering, scheduling, and interruption.
 * Gemini Live API outputs audio at 24kHz.
 */

const SAMPLE_RATE = 24000;

export class AudioStreamer {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private scheduledTime: number = 0;
  private playing: boolean = false;
  private queue: Float32Array[] = [];
  private activeSources: AudioBufferSourceNode[] = [];

  onPlaybackStateChange: ((playing: boolean) => void) | null = null;

  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  /** Decode base64 PCM16 and schedule for playback */
  addPCM16(base64: string): void {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    this.queue.push(float32);

    if (!this.playing) {
      this.playing = true;
      this.scheduledTime = this.audioContext.currentTime;
      this.onPlaybackStateChange?.(true);
    }

    this.schedulePlayback();
  }

  private schedulePlayback(): void {
    while (this.queue.length > 0) {
      const samples = this.queue.shift()!;
      const buffer = this.audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const startTime = Math.max(this.scheduledTime, this.audioContext.currentTime);
      source.start(startTime);
      this.scheduledTime = startTime + buffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        if (this.activeSources.length === 0 && this.queue.length === 0) {
          this.playing = false;
          this.onPlaybackStateChange?.(false);
        }
      };
    }
  }

  /** Stop playback immediately (e.g. when user interrupts) */
  interrupt(): void {
    this.queue = [];
    // Stop all scheduled/playing sources immediately
    for (const source of this.activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.activeSources = [];
    // Reset gain in case it was ramped
    this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
    this.playing = false;
    this.scheduledTime = 0;
    this.onPlaybackStateChange?.(false);
  }

  close(): void {
    this.interrupt();
    if (this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
  }
}

/**
 * Captures microphone audio via AudioWorklet, downsamples to 16kHz PCM16 base64.
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  onData: ((base64: string) => void) | null = null;
  onVolume: ((volume: number) => void) | null = null;

  async start(): Promise<void> {
    // Create AudioContext synchronously in user-gesture window
    this.audioContext = new AudioContext();
    console.log("AudioRecorder: ctx state =", this.audioContext.state, "rate =", this.audioContext.sampleRate);

    // Load worklet from real file (Blob URLs can be blocked)
    await this.audioContext.audioWorklet.addModule("/recorder-worklet.js");
    console.log("AudioRecorder: worklet loaded");

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    console.log("AudioRecorder: got mic stream, tracks =", this.stream.getAudioTracks().length);

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const nativeSampleRate = this.audioContext.sampleRate;
    const ratio = nativeSampleRate / 16000;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "recorder-processor");

    let msgCount = 0;
    this.workletNode.port.onmessage = (e: MessageEvent) => {
      const rawInt16 = e.data?.int16Audio as Int16Array | undefined;
      if (!rawInt16) return;

      if (msgCount++ % 50 === 0) {
        console.log(`AudioRecorder: worklet msg #${msgCount}, samples=${rawInt16.length}, onData=${!!this.onData}`);
      }

      // Downsample from native rate to 16kHz
      const downLen = Math.floor(rawInt16.length / ratio);
      const int16 = new Int16Array(downLen);
      for (let i = 0; i < downLen; i++) {
        int16[i] = rawInt16[Math.floor(i * ratio)];
      }

      // Int16 → base64
      if (this.onData) {
        try {
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = btoa(binary);
          if (msgCount % 100 === 1) {
            console.log("AudioRecorder: calling onData, b64len =", b64.length);
          }
          this.onData(b64);
        } catch (err) {
          console.error("AudioRecorder: onData error", err);
        }
      }

      if (this.onVolume) {
        let sum = 0;
        for (let i = 0; i < int16.length; i++) {
          sum += Math.abs(int16[i]);
        }
        this.onVolume(sum / int16.length / 32768);
      }
    };

    this.source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
    console.log("AudioRecorder: pipeline ready");
  }

  stop(): void {
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audioContext?.state !== "closed") {
      this.audioContext?.close();
    }
    this.workletNode = null;
    this.source = null;
    this.stream = null;
    this.audioContext = null;
  }
}

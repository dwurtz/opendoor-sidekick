/**
 * Inline AudioWorklet processor source code.
 * Adapted from Google's live-api-web-console (Apache 2.0 license).
 * Using inline strings + Blob URLs avoids needing static files in /public.
 */

export const recorderWorkletSrc = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input && input.length > 0) {
      // Float32 [-1,1] → Int16 [-32768, 32767]
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage({ int16Audio: int16 }, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

/** Convert an inline source string to a Blob URL suitable for AudioWorklet.addModule() */
export function createWorkletFromSrc(src: string): string {
  const blob = new Blob([src], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

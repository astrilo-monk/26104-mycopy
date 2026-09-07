import { useCallback, useRef, useState } from "react";

type RecorderState = "idle" | "requesting" | "recording" | "error";

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true));
  return new Blob([buffer], { type: "audio/wav" });
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);

  const cleanUp = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setSeconds(0);
    samplesRef.current = [];
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => samplesRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(context.destination);
      contextRef.current = context;
      streamRef.current = stream;
      sourceRef.current = source;
      processorRef.current = processor;
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      setState("recording");
    } catch {
      cleanUp();
      setError("Microphone permission was not granted. You can upload a file instead.");
      setState("error");
    }
  }, [cleanUp]);

  const stop = useCallback((): File | null => {
    if (!contextRef.current || samplesRef.current.length === 0) {
      cleanUp();
      setState("idle");
      return null;
    }
    const sampleRate = contextRef.current.sampleRate;
    const length = samplesRef.current.reduce((total, current) => total + current.length, 0);
    const flattened = new Float32Array(length);
    let offset = 0;
    samplesRef.current.forEach((chunk) => {
      flattened.set(chunk, offset);
      offset += chunk.length;
    });
    cleanUp();
    setState("idle");
    return new File([encodeWav(flattened, sampleRate)], `recording-${Date.now()}.wav`, { type: "audio/wav" });
  }, [cleanUp]);

  return { state, seconds, error, start, stop };
}

import { CircleStop, FileAudio, Mic, RefreshCw, ScanLine, UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { ApiError, analyze } from "../lib/api";
import type { AnalyzeResponse, AuthSession, ChunkResult } from "../lib/types";
import { riskLevelFor } from "../lib/types";
import { formatPercent } from "../lib/utils";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { RiskBadge } from "../components/RiskBadge";
import { Waveform } from "../components/Waveform";
import { Button } from "../components/ui/button";

const acceptedTypes = new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a"]);

function supportedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return acceptedTypes.has(file.type) || ["wav", "mp3", "m4a"].includes(extension ?? "");
}

function ProcessingState({ elapsed }: { elapsed: number }) {
  return (
    <div className="border border-signal/30 bg-signal/[0.06] p-5">
      <div className="flex gap-4"><RefreshCw className="mt-0.5 animate-spin text-signal" size={20} /><div><p className="font-medium">Analysis is running on the CPU inference service.</p><p className="mt-1 text-sm leading-6 text-muted">The server returns results after every audio window has been scored and recorded. This can take several seconds for longer files.</p><p className="mt-3 font-mono text-xs text-[#a6d8d0]">Elapsed {elapsed}s · Do not close this page</p></div></div>
    </div>
  );
}

function ResultSummary({ result, selected }: { result: AnalyzeResponse; selected?: ChunkResult }) {
  const level = riskLevelFor(result.overallSpoofProbability);
  return (
    <section className="panel">
      <div className="border-b border-line p-5 sm:flex sm:items-start sm:justify-between"><div><p className="eyebrow">Analysis complete</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{result.callId}</h2></div><div className="mt-4 sm:mt-0"><RiskBadge level={level} /></div></div>
      <div className="grid border-b border-line sm:grid-cols-3"><div className="border-b border-line p-5 sm:border-b-0 sm:border-r"><p className="eyebrow">Overall probability</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{formatPercent(result.overallSpoofProbability)}</p><p className="mt-1 text-sm text-muted">Maximum detected window</p></div><div className="border-b border-line p-5 sm:border-b-0 sm:border-r"><p className="eyebrow">Evidence windows</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{result.chunkResults.length}</p><p className="mt-1 text-sm text-muted">1 second step</p></div><div className="p-5"><p className="eyebrow">Selected window</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{selected ? formatPercent(selected.spoofProbability) : "—"}</p><p className="mt-1 text-sm text-muted">{selected ? `${selected.timestamp.toFixed(1)}s offset` : "Choose a bar below"}</p></div></div>
      <div className="p-5"><Waveform chunks={result.chunkResults} onSelect={() => undefined} selectedChunk={selected?.chunkId} /></div>
    </section>
  );
}

export function AnalyzePage({ session }: { session: AuthSession }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<number | undefined>();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();
  const selected = useMemo(() => result?.chunkResults.find((chunk) => chunk.chunkId === selectedChunkId) ?? result?.chunkResults.at(-1), [result, selectedChunkId]);

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    if (!supportedFile(candidate)) {
      setError("Use a WAV, MP3, or M4A file. Browser recordings are converted to WAV automatically.");
      return;
    }
    setFile(candidate);
    setResult(null);
    setSelectedChunkId(undefined);
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function submit() {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    try {
      const nextResult = await analyze(file, session.token);
      setResult(nextResult);
      setSelectedChunkId(nextResult.chunkResults.at(-1)?.chunkId);
    } catch (exception) {
      const apiError = exception instanceof ApiError ? exception : new ApiError("Analysis failed unexpectedly.");
      setError(apiError.status === 401 ? "Your session has expired. Sign in again and retry the upload." : apiError.message);
    } finally {
      window.clearInterval(timer);
      setProcessing(false);
    }
  }

  function stopRecording() {
    const recording = recorder.stop();
    if (recording) chooseFile(recording);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Analysis workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Inspect an audio sample</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Submit a file or microphone recording. The service applies overlapping 4.04-second AASIST windows and persists each result as evidence.</p></div><div className="border border-line bg-panel px-3 py-2 text-xs text-muted">Signed in as <span className="text-ink">{session.user.email}</span></div></div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="panel p-5 sm:p-6">
          <p className="eyebrow">Source audio</p>
          <button className={`mt-4 flex min-h-56 w-full flex-col items-center justify-center border border-dashed px-6 text-center transition-colors ${dragging ? "border-signal bg-signal/[0.06]" : "border-line bg-[#0c0f12] hover:border-[#43515c]"}`} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} type="button"><UploadCloud className="text-signal" size={26} /><p className="mt-4 font-medium">Drop an audio file here, or browse</p><p className="mt-1 text-sm text-muted">WAV, MP3, or M4A · 50 MB maximum</p><input accept=".wav,.mp3,.m4a,audio/wav,audio/mpeg,audio/mp4" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0])} ref={inputRef} type="file" /></button>
          {file && <div className="mt-4 flex items-center justify-between border border-line bg-raised p-3"><div className="flex min-w-0 items-center gap-3"><FileAudio className="shrink-0 text-signal" size={18} /><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "audio file"}</p></div></div><Button disabled={processing} onClick={() => { setFile(null); setResult(null); }} variant="ghost">Remove</Button></div>}
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or capture from microphone<span className="h-px flex-1 bg-line" /></div>
          {recorder.state === "recording" ? <Button className="w-full" onClick={stopRecording} variant="danger"><CircleStop size={17} /> Stop recording · {recorder.seconds}s</Button> : <Button className="w-full" disabled={processing || recorder.state === "requesting"} onClick={recorder.start} variant="secondary"><Mic size={17} /> {recorder.state === "requesting" ? "Requesting microphone…" : "Record audio"}</Button>}
          {recorder.error && <p className="mt-3 text-sm text-[#f2a3a3]">{recorder.error}</p>}
          <Button className="mt-4 w-full" disabled={!file || processing} onClick={submit}><ScanLine size={17} /> {processing ? "Analysis in progress" : "Run analysis"}</Button>
        </div>
        <aside className="panel p-5"><p className="eyebrow">Decision thresholds</p><div className="mt-5 space-y-4 text-sm"><div className="border-l-2 border-risk-low pl-3"><p className="font-medium">Low</p><p className="mt-1 text-muted">Below 50% spoof probability</p></div><div className="border-l-2 border-risk-medium pl-3"><p className="font-medium">Medium</p><p className="mt-1 text-muted">50% to below 80%</p></div><div className="border-l-2 border-risk-high pl-3"><p className="font-medium">High</p><p className="mt-1 text-muted">80% or greater</p></div></div><p className="mt-8 border-t border-line pt-4 text-xs leading-5 text-muted">The service records every returned window to the detection API. A transport error is shown rather than presenting an unrecorded result as complete.</p></aside>
      </section>
      {processing && <ProcessingState elapsed={elapsed} />}
      {error && <div aria-live="polite" className="border border-risk-high/40 bg-risk-high/10 p-4 text-sm text-[#f2a3a3]"><strong>Analysis unavailable.</strong> {error}</div>}
      {result && <section className="panel"><div className="border-b border-line p-5 sm:flex sm:items-start sm:justify-between"><div><p className="eyebrow">Analysis complete</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{result.callId}</h2></div><div className="mt-4 sm:mt-0"><RiskBadge level={riskLevelFor(result.overallSpoofProbability)} /></div></div><div className="grid border-b border-line sm:grid-cols-3"><div className="border-b border-line p-5 sm:border-b-0 sm:border-r"><p className="eyebrow">Overall probability</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{formatPercent(result.overallSpoofProbability)}</p><p className="mt-1 text-sm text-muted">Maximum detected window</p></div><div className="border-b border-line p-5 sm:border-b-0 sm:border-r"><p className="eyebrow">Evidence windows</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{result.chunkResults.length}</p><p className="mt-1 text-sm text-muted">1 second step</p></div><div className="p-5"><p className="eyebrow">Selected window</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{selected ? formatPercent(selected.spoofProbability) : "—"}</p><p className="mt-1 text-sm text-muted">{selected ? `${selected.timestamp.toFixed(1)}s offset` : "Choose a bar below"}</p></div></div><div className="p-5"><Waveform chunks={result.chunkResults} onSelect={setSelectedChunkId} selectedChunk={selected?.chunkId} /></div></section>}
    </div>
  );
}

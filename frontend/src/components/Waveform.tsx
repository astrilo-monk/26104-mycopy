import type { ChunkResult } from "../lib/types";
import { cn, formatPercent } from "../lib/utils";

interface WaveformProps {
  chunks: ChunkResult[];
  selectedChunk?: number;
  onSelect?: (chunkId: number) => void;
}

function barTone(probability: number) {
  if (probability >= 0.8) return "bg-risk-high";
  if (probability >= 0.5) return "bg-risk-medium";
  return "bg-risk-low";
}

export function Waveform({ chunks, selectedChunk, onSelect }: WaveformProps) {
  if (chunks.length === 0) return null;

  return (
    <div className="border border-line bg-[#0c0f12] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">Window-level spoof probability</span>
        <span className="text-xs text-muted">4.04s window · 1s step</span>
      </div>
      <div className="flex h-36 items-end gap-1 border-b border-line pb-1">
        {chunks.map((chunk) => {
          const height = Math.max(6, Math.round(chunk.spoofProbability * 100));
          const selected = chunk.chunkId === selectedChunk;
          return (
            <button
              aria-label={`Window ${chunk.chunkId}, ${formatPercent(chunk.spoofProbability)} spoof probability`}
              className={cn(
                "group relative min-w-2 flex-1 rounded-t-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100",
                selected && "opacity-100 outline outline-1 outline-offset-2 outline-ink"
              )}
              key={chunk.chunkId}
              onClick={() => onSelect?.(chunk.chunkId)}
              style={{ height: `${height}%` }}
              type="button"
            >
              <span className={cn("absolute inset-0 rounded-t-sm", barTone(chunk.spoofProbability))} />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-muted">
        <span>0.0s</span>
        <span>{chunks.at(-1)?.timestamp.toFixed(1)}s</span>
      </div>
    </div>
  );
}

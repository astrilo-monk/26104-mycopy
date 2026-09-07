export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface ChunkResult {
  chunkId: number;
  modelScore: number;
  spoofProbability: number;
  timestamp: number;
}

export interface AnalyzeResponse {
  callId: string;
  chunkResults: ChunkResult[];
  overallSpoofProbability: number;
}

export interface CallRecord {
  id: number;
  callId: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status?: string | null;
}

export interface AlertRecord {
  id: number;
  callId: string;
  riskLevel: RiskLevel;
  message?: string | null;
  action?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export function riskLevelFor(probability: number): RiskLevel {
  if (probability >= 0.8) return "HIGH";
  if (probability >= 0.5) return "MEDIUM";
  return "LOW";
}

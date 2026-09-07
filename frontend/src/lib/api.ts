import type {
  AlertRecord,
  AnalyzeResponse,
  CallRecord,
  TokenResponse,
  User
} from "./types";

const authUrl = import.meta.env.VITE_AUTH_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001";
const inferenceUrl = import.meta.env.VITE_INFERENCE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const springUrl = import.meta.env.VITE_SPRING_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError("The service could not be reached. Check that it is running and CORS is configured.");
  }

  if (!response.ok) {
    let detail = "The request could not be completed.";
    try {
      const body = (await response.json()) as { detail?: string; message?: string };
      detail = body.detail ?? body.message ?? detail;
    } catch {
      // The response was not JSON; retain the useful generic message.
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function signIn(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>(`${authUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export async function signUp(name: string, email: string, password: string): Promise<User> {
  return request<User>(`${authUrl}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });
}

export async function getMe(token: string): Promise<User> {
  return request<User>(`${authUrl}/me`, { headers: bearer(token) });
}

export async function analyze(file: File, token: string): Promise<AnalyzeResponse> {
  const body = new FormData();
  body.append("file", file);
  return request<AnalyzeResponse>(`${inferenceUrl}/analyze`, {
    method: "POST",
    headers: bearer(token),
    body
  });
}

export async function getCalls(token: string): Promise<CallRecord[]> {
  return request<CallRecord[]>(`${springUrl}/calls`, { headers: bearer(token) });
}

export async function getAlerts(token: string): Promise<AlertRecord[]> {
  return request<AlertRecord[]>(`${springUrl}/alerts`, { headers: bearer(token) });
}

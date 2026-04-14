import { apiBaseURL } from "./config";
import { getAuthToken } from "../lib/auth";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const accessToken = getAuthToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiBaseURL}${path}`, {
    ...init,
    headers,
  });
}

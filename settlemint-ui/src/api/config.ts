const fallbackApiBaseURL = "http://localhost:8080";

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || fallbackApiBaseURL;
export const authTokenStorageKey = "settlemint.auth.token";

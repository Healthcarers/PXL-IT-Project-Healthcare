const baseUrl = import.meta.env.VITE_API_BASE_URL;

if (!baseUrl) {
  throw new Error("VITE_API_BASE_URL is niet ingesteld");
}

export const API_BASE_URL = baseUrl;

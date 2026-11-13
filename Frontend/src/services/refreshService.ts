import axios from "axios";
import { API_BASE_URL } from "../config/api";

const baseURL = API_BASE_URL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Aparte instance zonder response interceptor
const refreshApi = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise: Promise<any> | null = null

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Voorkom oneindige retries
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshApi.post("/auth/refresh").finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // Browser stuurt automatisch de nieuwe cookie mee
      return api(originalRequest);
    } catch (refreshError) {
      // TODO: Voeg hier de centrale logout-flow toe.
      return Promise.reject(refreshError);
    }
  },
);

export default api;

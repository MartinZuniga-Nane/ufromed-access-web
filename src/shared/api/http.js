import axios from "axios";
import { getToken, clearSession } from "@/shared/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30000,
});

// Request interceptor - agrega Bearer token automáticamente
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - manejo de errores
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry automático ante errores de red (máximo 3 intentos)
    if (!error.response && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    if (!error.response && originalRequest._retryCount < 3) {
      originalRequest._retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * originalRequest._retryCount));
      return http(originalRequest);
    }

    // Si el token expiró o es inválido (401), limpiar sesión y redirigir
    if (error.response?.status === 401) {
      clearSession();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export { http };
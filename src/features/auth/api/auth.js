import { api } from "@/shared/api";
import { setToken, setUser, clearSession } from "@/shared/auth";

/**
 * @typedef {Object} LoginRequest
 * @property {string} rut
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} accessToken
 * @property {string} role
 * @property {string} fullName
 */

/**
 * Realiza el login y guarda el token
 * @param {LoginRequest} request
 * @returns {Promise<LoginResponse>}
 */
export async function login(request) {
  const { data } = await api.post("/auth/login", request);
  
  // Guardar token y datos de usuario en sessionStorage
  setToken(data.accessToken);
  setUser({
    role: data.role,
    fullName: data.fullName,
  });
  
  return data;
}

/**
 * Cierra la sesión y limpia los datos
 */
export function logout() {
  clearSession();
  window.location.href = "/login";
}

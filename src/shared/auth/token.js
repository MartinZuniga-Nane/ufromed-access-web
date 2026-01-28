/**
 * Helper centralizado para manejo seguro del token JWT
 * Usa sessionStorage para que el token se borre al cerrar la pestaña
 */

const TOKEN_KEY = "ufro_access_token";
const USER_KEY = "ufro_user";

/**
 * Guarda el token en sessionStorage
 * @param {string} token - JWT token
 */
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Obtiene el token de sessionStorage
 * @returns {string | null}
 */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Elimina el token de sessionStorage
 */
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Guarda los datos del usuario en sessionStorage
 * @param {Object} user - Datos del usuario { role, fullName }
 */
export function setUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Obtiene los datos del usuario de sessionStorage
 * @returns {Object | null}
 */
export function getUser() {
  const user = sessionStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Elimina los datos del usuario de sessionStorage
 */
export function clearUser() {
  sessionStorage.removeItem(USER_KEY);
}

/**
 * Limpia toda la sesión (token + user)
 */
export function clearSession() {
  clearToken();
  clearUser();
}

/**
 * Verifica si hay una sesión activa
 * @returns {boolean}
 */
export function hasSession() {
  return !!getToken();
}

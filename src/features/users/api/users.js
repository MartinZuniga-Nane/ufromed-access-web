import { api } from "@/shared/api";

/**
 * Roles de usuario disponibles
 */
export const UserRoles = {
  ADMIN: "ADMIN",
  SECRETARY: "SECRETARY",
};

/**
 * Obtiene la lista de usuarios paginada
 * @param {Object} params - Parámetros de paginación
 * @param {number} params.page - Número de página (1-based)
 * @param {number} params.size - Tamaño de página (1-200, default: 10)
 * @param {string} [params.rutPrefix] - Prefijo de RUT para búsqueda (opcional)
 * @param {string} [params.namePrefix] - Prefijo de nombre para búsqueda (opcional)
 * @param {string} [params.role] - Filtro por rol (opcional)
 * @returns {Promise<Object>} - Page<UserResponse> de Spring
 */
export async function getUsers({ page = 1, size = 10, rutPrefix = "", namePrefix = "", role = null } = {}) {
  const params = { page, size };
  if (rutPrefix) {
    params.rutPrefix = rutPrefix;
  }
  if (namePrefix) {
    params.namePrefix = namePrefix;
  }
  if (role) {
    params.role = role;
  }
  const response = await api.get("/users", { params });
  return response.data;
}

/**
 * Crea un nuevo usuario
 * @param {Object} data - Datos del usuario
 * @param {string} data.rut - RUT del usuario
 * @param {string} data.fullName - Nombre completo
 * @param {string} data.role - Rol (ADMIN o SECRETARY)
 * @returns {Promise<Object>} - { user: UserResponse, temporaryPassword: string }
 */
export async function createUser(data) {
  const response = await api.post("/users", data);
  return response.data;
}

/**
 * Activa un usuario
 * @param {number} id - ID del usuario
 */
export async function activateUser(id) {
  await api.patch(`/users/${id}/activate`);
}

/**
 * Desactiva un usuario
 * @param {number} id - ID del usuario
 */
export async function deactivateUser(id) {
  await api.patch(`/users/${id}/deactivate`);
}

/**
 * Resetea la contraseña de un usuario
 * @param {number} id - ID del usuario
 * @returns {Promise<string>} - Nueva contraseña generada
 */
export async function resetUserPassword(id) {
  const response = await api.post(`/users/${id}/reset-password`);
  return response.data;
}

/**
 * Actualiza un usuario existente
 * @param {number} id - ID del usuario
 * @param {Object} data - Datos a actualizar
 * @param {string} data.fullName - Nombre completo
 * @param {string} data.role - Rol (ADMIN o SECRETARY)
 * @param {boolean} data.active - Estado activo/inactivo
 * @returns {Promise<Object>} - UserResponse
 */
export async function updateUser(id, data) {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
}

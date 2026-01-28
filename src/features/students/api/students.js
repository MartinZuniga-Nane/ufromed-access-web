import { api } from "@/shared/api";

/**
 * Estados de estudiante disponibles (del backend)
 */
export const StudentStatus = {
  AUTHORIZED: "AUTHORIZED",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
};

/**
 * Obtiene la lista de estudiantes paginada
 * @param {Object} params - Parámetros de paginación y filtros
 * @param {number} params.page - Número de página (1-based)
 * @param {number} params.size - Tamaño de página (1-200, default: 10)
 * @param {string} [params.runPrefix] - Prefijo de RUN para búsqueda (opcional)
 * @param {string} [params.namePrefix] - Prefijo de nombre o apellido para búsqueda (opcional)
 * @param {string} [params.firstNamePrefix] - Prefijo de nombre para búsqueda (opcional)
 * @param {string} [params.lastNamePrefix] - Prefijo de apellido para búsqueda (opcional)
 * @param {string} [params.status] - Filtro por estado (opcional)
 * @returns {Promise<Object>} - Page<StudentResponse> de Spring
 */
export async function getStudents({ page = 1, size = 10, runPrefix = "", namePrefix = "", firstNamePrefix = "", lastNamePrefix = "", status = "" } = {}) {
  const params = { page, size };
  if (runPrefix) params.runPrefix = runPrefix;
  if (namePrefix) params.namePrefix = namePrefix;
  if (firstNamePrefix) params.firstNamePrefix = firstNamePrefix;
  if (lastNamePrefix) params.lastNamePrefix = lastNamePrefix;
  if (status) params.status = status;
  const response = await api.get("/students", { params });
  return response.data;
}

/**
 * Crea un nuevo estudiante
 * @param {Object} data - Datos del estudiante
 * @param {string} data.run - RUN del estudiante
 * @param {string} data.firstName - Nombre
 * @param {string} data.lastName - Apellidos
 * @param {string} data.status - Estado (AUTHORIZED, SUSPENDED, BANNED)
 * @returns {Promise<Object>} - StudentResponse
 */
export async function createStudent(data) {
  const response = await api.post("/students", data);
  return response.data;
}

/**
 * Actualiza un estudiante existente
 * @param {number} id - ID del estudiante
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - StudentResponse
 */
export async function updateStudent(id, data) {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
}

/**
 * Autoriza un estudiante (cambia estado a AUTHORIZED)
 * @param {number} id - ID del estudiante
 * @returns {Promise<void>}
 */
export async function authorizeStudent(id) {
  await api.patch(`/students/${id}/authorize`);
}

/**
 * Desautoriza un estudiante (cambia estado a NOT_AUTHORIZED)
 * @param {number} id - ID del estudiante
 * @returns {Promise<void>}
 */
export async function unauthorizeStudent(id) {
  await api.delete(`/students/${id}`);
}

/**
 * Actualiza el estado de múltiples estudiantes de forma masiva
 * @param {number[]} ids - IDs de los estudiantes
 * @param {string} status - Nuevo estado (AUTHORIZED o NOT_AUTHORIZED)
 * @returns {Promise<number>} - Cantidad de estudiantes actualizados
 */
export async function bulkUpdateStatus(ids, status) {
  const response = await api.patch("/students/bulk-status", { ids, status });
  return response.data;
}

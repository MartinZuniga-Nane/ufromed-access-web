import { api } from "@/shared/api";

/**
 * Estados de marcación de acceso
 */
export const AccessMarkStatus = {
  ENTRY: "ENTRY",
  EXIT: "EXIT",
};

/**
 * Obtiene la lista de marcaciones de acceso paginada
 * @param {Object} params - Parámetros de paginación y filtros
 * @param {number} params.page - Número de página (1-based)
 * @param {number} params.size - Tamaño de página (1-200, default: 10)
 * @param {string} [params.runPrefix] - Prefijo de RUN para búsqueda progresiva (opcional)
 * @param {string} [params.status] - Filtro por estado ENTRY/EXIT (opcional)
 * @param {string} [params.date] - Filtro por día (formato: 2026-02-16) (opcional)
 * @returns {Promise<Object>} - Page<AccessMarkResponse> de Spring
 */
export async function getAccessMarks({ page = 1, size = 10, runPrefix = "", status = "", date = "" } = {}) {
  const params = { page, size };
  if (runPrefix) params.runPrefix = runPrefix;
  if (status) params.status = status;
  if (date) params.date = date;
  const response = await api.get("/access/marks", { params });
  return response.data;
}

/**
 * Obtiene una marcación por ID
 * @param {number} id - ID de la marcación
 * @returns {Promise<Object>} - AccessMarkResponse
 */
export async function getAccessMarkById(id) {
  const response = await api.get(`/access/marks/${id}`);
  return response.data;
}

/**
 * Elimina una marcación de acceso
 * @param {number} id - ID de la marcación
 */
export async function deleteAccessMark(id) {
  await api.delete(`/access/marks/${id}`);
}

/**
 * Elimina marcaciones de acceso en bulk
 * @param {number[]} ids - IDs de las marcaciones a eliminar
 * @returns {Promise<Object>} - DeleteMarksResponse con contadores
 */
export async function bulkDeleteAccessMarks(ids) {
  const response = await api.delete("/access/marks/bulk", { data: { ids } });
  return response.data;
}

/**
 * Elimina marcaciones por status
 * @param {string} status - ENTRY o EXIT
 * @returns {Promise<Object>} - DeleteMarksResponse con contadores
 */
export async function deleteAccessMarksByStatus(status) {
  const response = await api.delete("/access/marks", { params: { status } });
  return response.data;
}

/**
 * Verifica elegibilidad de un RUN para marcar acceso
 * @param {string} run - RUN a verificar
 * @returns {Promise<Object>} - EligibilityResponse
 */
export async function checkEligibility(run) {
  const response = await api.get(`/access/mark-eligibility/${encodeURIComponent(run)}`);
  return response.data;
}

/**
 * Registra una entrada
 * @param {string} run - RUN del visitante
 * @returns {Promise<Object>} - MarkResponse
 */
export async function markEntry(run) {
  const response = await api.post("/access/mark-entry", { run });
  return response.data;
}

/**
 * Registra una salida
 * @param {string} run - RUN del visitante
 * @returns {Promise<Object>} - MarkResponse
 */
export async function markExit(run) {
  const response = await api.post("/access/mark-exit", { run });
  return response.data;
}

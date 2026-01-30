import { api } from "@/shared/api";

/**
 * Estados de visita del backend
 */
export const VisitStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
};

/**
 * Estados de visita para mostrar en el frontend
 * Incluye PENDING que se calcula cuando validFrom > ahora
 */
export const VisitDisplayStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  PENDING: "PENDING", // Calculado en frontend: status=ACTIVE pero validFrom > ahora
};

/**
 * Obtiene la lista de visitas paginada
 * @param {Object} params - Parámetros de paginación y filtros
 * @param {number} params.page - Número de página (1-based)
 * @param {number} params.size - Tamaño de página (1-200, default: 10)
 * @param {string} [params.runPrefix] - Prefijo de RUN para búsqueda (opcional)
 * @param {string} [params.namePrefix] - Prefijo de nombre completo para búsqueda (opcional)
 * @param {string} [params.status] - Filtro por estado (opcional)
 * @returns {Promise<Object>} - Page<VisitResponse> de Spring
 */
export async function getVisits({ page = 1, size = 10, runPrefix = "", namePrefix = "", status = "" } = {}) {
  const params = { page, size };
  if (runPrefix) params.runPrefix = runPrefix;
  if (namePrefix) params.namePrefix = namePrefix;
  if (status) params.status = status;
  const response = await api.get("/visits", { params });
  return response.data;
}

/**
 * Crea una nueva visita
 * @param {Object} data - Datos de la visita
 * @param {string} data.run - RUN del visitante
 * @param {string} data.fullName - Nombre completo
 * @param {string} data.validFrom - Fecha/hora de inicio (ISO)
 * @param {string} data.validUntil - Fecha/hora de fin (ISO)
 * @returns {Promise<Object>} - VisitResponse
 */
export async function createVisit(data) {
  const response = await api.post("/visits", data);
  return response.data;
}

/**
 * Actualiza una visita existente
 * @param {number} id - ID de la visita
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - VisitResponse
 */
export async function updateVisit(id, data) {
  const response = await api.put(`/visits/${id}`, data);
  return response.data;
}

/**
 * Elimina una visita
 * @param {number} id - ID de la visita
 */
export async function deleteVisit(id) {
  await api.delete(`/visits/${id}`);
}

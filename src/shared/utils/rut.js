/**
 * Utilidades para manejo de RUT/RUN chileno
 */

/**
 * Limpia un RUT removiendo puntos, guiones y espacios
 * Deja solo caracteres válidos: 0-9 y K (para dígito verificador)
 * @param {string} rut - RUT a limpiar
 * @returns {string} RUT limpio (solo números y K)
 */
export function cleanRut(rut) {
  if (!rut) return "";
  return rut.toUpperCase().replace(/[^0-9K]/g, "");
}

/**
 * Limpia el input para usarlo como prefijo de búsqueda
 * Remueve puntos, guiones y espacios, dejando solo dígitos y K
 * @param {string} input - Input del usuario
 * @returns {string} Prefijo limpio para búsqueda
 */
export function cleanForPrefix(input) {
  if (!input) return "";
  return input.toUpperCase().replace(/[^0-9K]/g, "");
}

/**
 * Formatea un RUT para mostrar (12.345.678-9)
 * @param {string} rut - RUT limpio
 * @returns {string} RUT formateado
 */
export function formatRut(rut) {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  
  // Formatear con puntos cada 3 dígitos desde la derecha
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formatted}-${dv}`;
}

/**
 * Valida si un RUT tiene formato válido (no valida el dígito verificador)
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si tiene formato válido
 */
export function isValidRutFormat(rut) {
  const clean = cleanRut(rut);
  // Mínimo 7 caracteres (6 dígitos + 1 DV), máximo 9 (8 dígitos + 1 DV)
  return clean.length >= 7 && clean.length <= 9 && /^[0-9]+[0-9K]$/.test(clean);
}

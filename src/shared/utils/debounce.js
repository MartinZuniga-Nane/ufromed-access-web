/**
 * Crea una función debounced que retrasa la ejecución
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Delay en milisegundos
 * @returns {Function} Función debounced
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;
  
  const debouncedFn = function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
  
  // Método para cancelar el debounce pendiente
  debouncedFn.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFn;
}

/**
 * Hook composable para usar debounce en Vue
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Delay en milisegundos
 * @returns {Object} { debouncedFn, cancel }
 */
export function useDebounce(fn, delay = 300) {
  const debouncedFn = debounce(fn, delay);
  
  return {
    debouncedFn,
    cancel: debouncedFn.cancel,
  };
}

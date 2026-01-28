/**
 * Configuración de navegación para el layout administrativo
 */

export const NAV_ITEMS = [
  { name: "Usuarios", path: "/usuarios", icon: "users", roles: ["ADMIN"] },
  { name: "Alumnos", path: "/alumnos", icon: "students", roles: ["ADMIN"] },
  { name: "Visitas", path: "/visitas", icon: "visits", roles: ["ADMIN", "SECRETARY"] },
];

/**
 * Obtiene los items de navegación según el rol del usuario
 * 
 * @param {string} role - Rol del usuario (ADMIN, SECRETARY)
 * @returns {Array} Items de navegación filtrados por rol
 */
export function getNavItemsForRole(role) {
  return NAV_ITEMS.filter(item => item.roles.includes(role));
}

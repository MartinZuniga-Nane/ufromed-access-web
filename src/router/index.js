import { createRouter, createWebHistory } from "vue-router";
import { hasSession, getUser } from "@/shared/auth";

// Lazy loading de páginas
const LoginPage = () => import("@/pages/LoginPage.vue");
const UsersPage = () => import("@/pages/UsersPage.vue");
const StudentsPage = () => import("@/pages/StudentsPage.vue");
const VisitsPage = () => import("@/pages/VisitsPage.vue");
const UnauthorizedPage = () => import("@/pages/UnauthorizedPage.vue");

// Layout
const AppLayout = () => import("@/layouts/AppLayout.vue");

/**
 * Obtiene la ruta por defecto según el rol del usuario
 * @returns {string} Ruta por defecto
 */
function getDefaultRoute() {
  const user = getUser();
  if (user?.role === "SECRETARY") {
    return "/visitas";
  }
  return "/usuarios";
}

const routes = [
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
  {
    path: "/unauthorized",
    name: "unauthorized",
    component: UnauthorizedPage,
    meta: { public: true },
  },
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: () => getDefaultRoute(),
      },
      {
        path: "usuarios",
        name: "users",
        component: UsersPage,
        meta: { roles: ["ADMIN"] },
      },
      {
        path: "alumnos",
        name: "students",
        component: StudentsPage,
        meta: { roles: ["ADMIN"] },
      },
      {
        path: "visitas",
        name: "visits",
        component: VisitsPage,
        meta: { roles: ["ADMIN", "SECRETARY"] },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/login",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard de navegación - usa helper centralizado de sesión
router.beforeEach((to, from, next) => {
  const isAuthenticated = hasSession();
  const user = getUser();

  // Si la ruta es pública, permitir acceso
  if (to.meta.public) {
    // Si está autenticado y va al login, redirigir según rol
    if (to.name === "login" && isAuthenticated) {
      return next(getDefaultRoute());
    }
    return next();
  }

  // Si requiere autenticación y no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next("/login");
  }

  // Verificar permisos por rol
  if (to.meta.roles && user) {
    if (!to.meta.roles.includes(user.role)) {
      return next("/unauthorized");
    }
  }

  next();
});

export default router;
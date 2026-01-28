import { createRouter, createWebHistory } from "vue-router";
import { hasSession } from "@/shared/auth";

// Lazy loading de páginas
const LoginPage = () => import("@/pages/LoginPage.vue");
const UsersPage = () => import("@/pages/UsersPage.vue");
const StudentsPage = () => import("@/pages/StudentsPage.vue");
const VisitsPage = () => import("@/pages/VisitsPage.vue");
const UnauthorizedPage = () => import("@/pages/UnauthorizedPage.vue");

// Layout
const AppLayout = () => import("@/layouts/AppLayout.vue");

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
        redirect: "/usuarios",
      },
      {
        path: "usuarios",
        name: "users",
        component: UsersPage,
      },
      {
        path: "alumnos",
        name: "students",
        component: StudentsPage,
      },
      {
        path: "visitas",
        name: "visits",
        component: VisitsPage,
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

  // Si la ruta es pública, permitir acceso
  if (to.meta.public) {
    // Si está autenticado y va al login, redirigir al dashboard
    if (to.name === "login" && isAuthenticated) {
      return next("/usuarios");
    }
    return next();
  }

  // Si requiere autenticación y no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next("/login");
  }

  next();
});

export default router;
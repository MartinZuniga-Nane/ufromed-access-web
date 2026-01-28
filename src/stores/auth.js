import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/shared/api";
import { setToken, getToken, setUser, getUser, clearSession, hasSession } from "@/shared/auth";

export const useAuthStore = defineStore("auth", () => {
  // Inicializar desde sessionStorage
  const token = ref(getToken());
  const user = ref(getUser());

  const isAuthenticated = computed(() => hasSession());
  const userRole = computed(() => user.value?.role || null);
  const userName = computed(() => user.value?.fullName || "");

  async function login(rut, password) {
    const response = await api.post("/auth/login", { rut, password });
    const data = response.data;

    // El backend devuelve accessToken, role y fullName
    const userData = {
      role: data.role,
      fullName: data.fullName,
    };

    // Guardar en sessionStorage
    setToken(data.accessToken);
    setUser(userData);

    // Actualizar estado reactivo
    token.value = data.accessToken;
    user.value = userData;

    return data;
  }

  function logout() {
    // Limpiar sessionStorage
    clearSession();
    
    // Resetear estado reactivo
    token.value = null;
    user.value = null;
  }

  return {
    token,
    user,
    isAuthenticated,
    userRole,
    userName,
    login,
    logout,
  };
});
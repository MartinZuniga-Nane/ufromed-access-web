<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const rut = ref("");
const password = ref("");
const isLoading = ref(false);
const error = ref("");
const showPassword = ref(false);

async function handleLogin() {
  if (!rut.value.trim() || !password.value.trim()) {
    error.value = "Por favor, complete todos los campos";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    await authStore.login(rut.value, password.value);
    router.push("/usuarios");
  } catch (err) {
    error.value = err.response?.data?.message || "Credenciales inválidas";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- Lado izquierdo - Logo institucional -->
    <div class="lg:w-1/2 bg-ufro flex flex-col items-center justify-center p-8 lg:p-12">
      <div class="text-center">
        <!-- Logo UFRO -->
        <div class="w-32 h-32 lg:w-40 lg:h-40 mx-auto mb-8 bg-white rounded-full flex items-center justify-center shadow-lg">
          <svg class="w-20 h-20 lg:w-24 lg:h-24 text-ufro" viewBox="0 0 100 100" fill="currentColor">
            <rect x="25" y="20" width="50" height="60" rx="4" />
            <circle cx="50" cy="50" r="15" fill="white" />
            <path d="M45 45 L55 45 L50 55 Z" fill="currentColor" />
          </svg>
        </div>
        
        <h1 class="text-white text-3xl lg:text-4xl font-bold mb-4">
          Universidad de la Frontera
        </h1>
        
        <div class="w-16 h-1 bg-white mx-auto mb-6"></div>
        
        <h2 class="text-white text-xl lg:text-2xl font-semibold">
          Control Acceso
        </h2>
      </div>
    </div>

    <!-- Lado derecho - Formulario de login -->
    <div class="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-gray-50">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-2">
            Iniciar Sesión
          </h2>
          <p class="text-gray-500 text-center mb-8">
            Ingrese sus credenciales institucionales
          </p>

          <form @submit.prevent="handleLogin" class="space-y-6">
            <!-- Campo RUT -->
            <div>
              <label for="rut" class="block text-sm font-medium text-gray-700 mb-2">
                RUT
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="rut"
                  v-model="rut"
                  type="text"
                  placeholder="12.345.678-9"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro transition-colors"
                  :disabled="isLoading"
                />
              </div>
            </div>

            <!-- Campo Contraseña -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro transition-colors"
                  :disabled="isLoading"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg v-if="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Mensaje de error -->
            <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {{ error }}
            </div>

            <!-- Botón de login -->
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full bg-ufro text-white py-3 px-4 rounded-lg font-semibold hover:bg-ufro-600 focus:ring-4 focus:ring-ufro-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? "Ingresando..." : "Iniciar Sesión" }}
            </button>
          </form>
        </div>

        <!-- Footer -->
        <p class="text-center text-gray-400 text-sm mt-8">
          © {{ new Date().getFullYear() }} Universidad de la Frontera. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </div>
</template>
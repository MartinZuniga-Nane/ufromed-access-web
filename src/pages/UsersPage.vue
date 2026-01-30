<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { getUsers, createUser, updateUser, activateUser, deactivateUser, resetUserPassword, UserRoles } from "@/features/users";
import { cleanForPrefix, debounce } from "@/shared/utils";
import Pagination from "@/components/Pagination.vue";

// Estado de paginación
const page = ref(1);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);

// Filtros
const searchRut = ref("");
const searchName = ref("");
const roleFilter = ref("");

// Datos
const users = ref([]);
const isLoading = ref(false);
const error = ref("");

// Menu de acciones
const activeMenuId = ref(null);

// Modal de contraseña
const showPasswordModal = ref(false);
const newPassword = ref("");

// Modal de crear usuario
const showCreateModal = ref(false);
const isCreating = ref(false);
const createForm = ref({
  rut: "",
  fullName: "",
  role: UserRoles.SECRETARY,
});
const createError = ref("");

// Modal de editar usuario
const showEditModal = ref(false);
const isEditing = ref(false);
const editingUser = ref(null);
const editForm = ref({
  fullName: "",
  role: UserRoles.SECRETARY,
  active: true,
});
const editError = ref("");

// Modal de confirmación
const showConfirmModal = ref(false);
const confirmAction = ref(null);
const confirmUserId = ref(null);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmButtonText = ref("");
const confirmButtonClass = ref("");
const isConfirming = ref(false);

async function loadUsers() {
  isLoading.value = true;
  error.value = "";
  
  try {
    // Sanitizar el input de búsqueda removiendo puntos y guiones
    const rutPrefix = cleanForPrefix(searchRut.value);
    const namePrefix = searchName.value.trim();
    
    const response = await getUsers({ 
      page: page.value, 
      size: size.value,
      rutPrefix: rutPrefix,
      namePrefix: namePrefix,
      role: roleFilter.value || null
    });
    users.value = response.content || [];
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (err) {
    // Manejar errores específicos
    if (err.response?.status === 400) {
      error.value = err.response?.data?.message || "RUT inválido";
    } else {
      error.value = "Error al cargar los usuarios";
    }
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

// Debounce para búsqueda por RUT (400ms)
const debouncedSearch = debounce(() => {
  page.value = 1;
  loadUsers();
}, 400);

// Watch para búsqueda en vivo por RUT
watch(searchRut, () => {
  debouncedSearch();
});

// Watch para búsqueda en vivo por nombre
watch(searchName, () => {
  debouncedSearch();
});

function handlePageChange(newPage) {
  page.value = newPage;
}

function handleRoleFilter() {
  page.value = 1;
  loadUsers();
}

function toggleMenu(userId) {
  activeMenuId.value = activeMenuId.value === userId ? null : userId;
}

function closeMenu() {
  activeMenuId.value = null;
}

// Crear usuario
function openCreateModal() {
  createForm.value = { rut: "", fullName: "", role: UserRoles.SECRETARY };
  createError.value = "";
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  createForm.value = { rut: "", fullName: "", role: UserRoles.SECRETARY };
  createError.value = "";
}

async function handleCreateUser() {
  if (!createForm.value.rut || !createForm.value.fullName) {
    createError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isCreating.value = true;
  createError.value = "";
  
  try {
    const result = await createUser(createForm.value);
    closeCreateModal();
    newPassword.value = result.temporaryPassword;
    showPasswordModal.value = true;
    await loadUsers();
  } catch (err) {
    // Manejar errores específicos del backend
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      createError.value = message || "Datos inválidos. Verifique el RUT y los campos.";
    } else if (status === 409) {
      createError.value = message || "El RUT ya existe en el sistema o pertenece a otra entidad.";
    } else {
      createError.value = message || "Error al crear el usuario";
    }
    console.error(err);
  } finally {
    isCreating.value = false;
  }
}

// Editar usuario
function openEditModal(user) {
  editingUser.value = user;
  editForm.value = {
    fullName: user.fullName,
    role: user.role,
    active: user.active,
  };
  editError.value = "";
  showEditModal.value = true;
  closeMenu();
}

function closeEditModal() {
  showEditModal.value = false;
  editingUser.value = null;
  editError.value = "";
}

async function handleEditUser() {
  if (!editForm.value.fullName) {
    editError.value = "El nombre es obligatorio";
    return;
  }
  
  isEditing.value = true;
  editError.value = "";
  
  try {
    await updateUser(editingUser.value.id, editForm.value);
    closeEditModal();
    await loadUsers();
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      editError.value = message || "Datos inválidos.";
    } else {
      editError.value = message || "Error al actualizar el usuario";
    }
    console.error(err);
  } finally {
    isEditing.value = false;
  }
}

async function handleActivate(userId) {
  try {
    await activateUser(userId);
    await loadUsers();
  } catch (err) {
    error.value = "Error al activar el usuario";
  }
  closeMenu();
}

// Mostrar modal de confirmación para desactivar
function confirmDeactivate(userId) {
  confirmUserId.value = userId;
  confirmAction.value = "deactivate";
  confirmTitle.value = "Desactivar Usuario";
  confirmMessage.value = "¿Estás seguro de que deseas desactivar este usuario? El usuario no podrá acceder al sistema hasta que sea reactivado.";
  confirmButtonText.value = "Desactivar";
  confirmButtonClass.value = "bg-red-600 hover:bg-red-700";
  showConfirmModal.value = true;
  closeMenu();
}

// Mostrar modal de confirmación para resetear contraseña
function confirmResetPassword(userId) {
  confirmUserId.value = userId;
  confirmAction.value = "resetPassword";
  confirmTitle.value = "Resetear Contraseña";
  confirmMessage.value = "¿Estás seguro de que deseas resetear la contraseña de este usuario? Se generará una nueva contraseña temporal y la anterior dejará de funcionar.";
  confirmButtonText.value = "Resetear";
  confirmButtonClass.value = "bg-yellow-600 hover:bg-yellow-700";
  showConfirmModal.value = true;
  closeMenu();
}

function closeConfirmModal() {
  showConfirmModal.value = false;
  confirmAction.value = null;
  confirmUserId.value = null;
  isConfirming.value = false;
}

async function executeConfirmedAction() {
  if (!confirmAction.value || !confirmUserId.value) return;
  
  isConfirming.value = true;
  
  try {
    if (confirmAction.value === "deactivate") {
      await deactivateUser(confirmUserId.value);
      await loadUsers();
    } else if (confirmAction.value === "resetPassword") {
      const password = await resetUserPassword(confirmUserId.value);
      newPassword.value = password;
      showPasswordModal.value = true;
    }
    closeConfirmModal();
  } catch (err) {
    error.value = confirmAction.value === "deactivate" 
      ? "Error al desactivar el usuario" 
      : "Error al resetear la contraseña";
    closeConfirmModal();
  }
}

async function handleDeactivate(userId) {
  try {
    await deactivateUser(userId);
    await loadUsers();
  } catch (err) {
    error.value = "Error al desactivar el usuario";
  }
  closeMenu();
}

async function handleResetPassword(userId) {
  try {
    const password = await resetUserPassword(userId);
    newPassword.value = password;
    showPasswordModal.value = true;
  } catch (err) {
    error.value = "Error al resetear la contraseña";
  }
  closeMenu();
}

function closePasswordModal() {
  showPasswordModal.value = false;
  newPassword.value = "";
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(newPassword.value);
  } catch (err) {
    console.error("Error al copiar:", err);
  }
}

function formatRole(role) {
  const roles = {
    ADMIN: "Administrador",
    SECRETARY: "Secretaria",
  };
  return roles[role] || role;
}

function formatStatus(active) {
  return active ? "Activo" : "Inactivo";
}

// Watch para cambios de página
watch(page, () => {
  loadUsers();
});

onMounted(() => {
  loadUsers();
});

// Limpiar debounce al desmontar
onUnmounted(() => {
  debouncedSearch.cancel();
});

// Cerrar menú al hacer clic fuera
function handleClickOutside(event) {
  if (!event.target.closest(".action-menu")) {
    closeMenu();
  }
}
</script>

<template>
  <div @click="handleClickOutside">
    <!-- Card principal -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <!-- Header de la tabla -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Lista de Usuarios</h3>
            <p class="text-sm text-gray-500">Gestión de todos los usuarios del sistema</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            <!-- Buscador por RUT -->
            <div class="relative">
              <input
                v-model="searchRut"
                type="text"
                placeholder="Buscar por RUT..."
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro pr-8"
              />
              <svg v-if="isLoading && searchRut" class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            
            <!-- Buscador por nombre -->
            <div class="relative">
              <input
                v-model="searchName"
                type="text"
                placeholder="Buscar por nombre..."
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro pr-8"
              />
              <svg v-if="isLoading && searchName" class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            
            <!-- Filtro por rol -->
            <select
              v-model="roleFilter"
              @change="handleRoleFilter"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
            >
              <option value="">Todos los roles</option>
              <option :value="UserRoles.ADMIN">Administrador</option>
              <option :value="UserRoles.SECRETARY">Secretaria</option>
            </select>
            
            <!-- Botón crear -->
            <button
              @click="openCreateModal"
              class="px-4 py-2 text-sm font-medium text-white bg-ufro rounded-lg hover:bg-ufro-600 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Crear Usuario
            </button>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
        {{ error }}
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <svg class="animate-spin h-8 w-8 text-ufro" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- Tabla -->
      <div v-else class="overflow-x-auto">
        <table class="w-full table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-1/3 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th class="w-1/5 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                RUT
              </th>
              <th class="w-1/6 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th class="w-1/6 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="w-24 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ user.fullName }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ user.rut }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ufro-50 text-ufro">
                  {{ formatRole(user.role) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ formatStatus(user.active) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative action-menu inline-block">
                  <button
                    @click.stop="toggleMenu(user.id)"
                    class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="activeMenuId === user.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                  >
                    <button
                      @click="openEditModal(user)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      v-if="!user.active"
                      @click="handleActivate(user.id)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Activar
                    </button>
                    <button
                      v-if="user.active"
                      @click="confirmDeactivate(user.id)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Desactivar
                    </button>
                    <button
                      @click="confirmResetPassword(user.id)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Resetear Contraseña
                    </button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="users.length === 0 && !isLoading">
              <td colspan="5" class="px-6 py-12 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                <p class="mt-1 text-sm text-gray-500">No se encontraron usuarios en el sistema.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <Pagination
        v-if="totalPages > 0"
        :page="page"
        :total-pages="totalPages"
        :total-elements="totalElements"
        :size="size"
        @change="handlePageChange"
      />
    </div>

    <!-- Modal de nueva contraseña -->
    <div
      v-if="showPasswordModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Contraseña Temporal</h3>
        </div>
        
        <p class="text-sm text-gray-600 mb-4">
          La contraseña temporal ha sido generada. Asegúrese de copiarla ahora, no podrá verla de nuevo.
        </p>
        
        <div class="bg-gray-100 rounded-lg p-4 font-mono text-center text-lg select-all mb-4 flex items-center justify-between gap-2">
          <span class="flex-1">{{ newPassword }}</span>
          <button
            @click="copyPassword"
            class="p-2 text-gray-500 hover:text-ufro rounded transition-colors"
            title="Copiar contraseña"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
        
        <button
          @click="closePasswordModal"
          class="w-full bg-ufro text-white py-2 px-4 rounded-lg font-medium hover:bg-ufro-600 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>

    <!-- Modal de crear usuario -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h3>
          <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="createError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ createError }}
        </div>

        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RUT</label>
            <input
              v-model="createForm.rut"
              type="text"
              placeholder="12.345.678-9"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              v-model="createForm.fullName"
              type="text"
              placeholder="Juan Pérez González"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              v-model="createForm.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
              required
            >
              <option :value="UserRoles.ADMIN">Administrador</option>
              <option :value="UserRoles.SECRETARY">Secretaria</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="closeCreateModal"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-ufro rounded-lg hover:bg-ufro-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCreating ? 'Creando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">{{ confirmTitle }}</h3>
        </div>
        
        <p class="text-sm text-gray-600 mb-6">
          {{ confirmMessage }}
        </p>
        
        <div class="flex gap-3">
          <button
            @click="closeConfirmModal"
            :disabled="isConfirming"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="executeConfirmedAction"
            :disabled="isConfirming"
            :class="[
              'flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              confirmButtonClass
            ]"
          >
            {{ isConfirming ? 'Procesando...' : confirmButtonText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de editar usuario -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Editar Usuario</h3>
          <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="editError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ editError }}
        </div>

        <form @submit.prevent="handleEditUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RUT</label>
            <input
              :value="editingUser?.rut"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              v-model="editForm.fullName"
              type="text"
              placeholder="Juan Pérez González"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              v-model="editForm.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
              required
            >
              <option :value="UserRoles.ADMIN">Administrador</option>
              <option :value="UserRoles.SECRETARY">Secretaria</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              v-model="editForm.active"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
              required
            >
              <option :value="true">Activo</option>
              <option :value="false">Inactivo</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="closeEditModal"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isEditing"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-ufro rounded-lg hover:bg-ufro-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isEditing ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
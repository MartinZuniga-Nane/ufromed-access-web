<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { getVisits, createVisit, updateVisit, deleteVisit, VisitStatus, VisitDisplayStatus } from "@/features/visits";
import { cleanForPrefix, debounce } from "@/shared/utils";
import Pagination from "@/components/Pagination.vue";

// Estado de paginación
const page = ref(1);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);

// Filtros
const searchRun = ref("");
const searchName = ref("");
const statusFilter = ref("");

// Datos
const visits = ref([]);
const isLoading = ref(false);
const error = ref("");

// Menu de acciones
const activeMenuId = ref(null);

// Modal de crear visita
const showCreateModal = ref(false);
const isCreating = ref(false);
const createForm = ref({
  run: "",
  fullName: "",
  validFrom: "",
  validUntil: "",
});
const createError = ref("");

// Modal de editar visita
const showEditModal = ref(false);
const isEditing = ref(false);
const editingVisit = ref(null);
const editForm = ref({
  fullName: "",
  validFrom: "",
  validUntil: "",
});
const editError = ref("");

// Modal de confirmación de eliminación
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const deletingVisit = ref(null);

async function loadVisits() {
  isLoading.value = true;
  error.value = "";
  
  try {
    // Si el filtro es PENDING, pedimos ACTIVE al backend y filtramos en frontend
    const backendStatus = statusFilter.value === VisitDisplayStatus.PENDING 
      ? VisitStatus.ACTIVE 
      : statusFilter.value;
    
    // Sanitizar el input de búsqueda removiendo puntos y guiones
    const runPrefix = cleanForPrefix(searchRun.value);
    const namePrefix = searchName.value.trim();
    
    const response = await getVisits({
      page: page.value,
      size: size.value,
      runPrefix: runPrefix,
      namePrefix: namePrefix,
      status: backendStatus,
    });
    
    let content = response.content || [];
    
    // Filtrar en frontend si se seleccionó PENDING
    if (statusFilter.value === VisitDisplayStatus.PENDING) {
      const now = new Date();
      content = content.filter(visit => {
        const validFrom = new Date(visit.validFrom);
        return validFrom > now;
      });
    }
    // Si se seleccionó ACTIVE, excluir las que aún no empiezan
    else if (statusFilter.value === VisitStatus.ACTIVE) {
      const now = new Date();
      content = content.filter(visit => {
        const validFrom = new Date(visit.validFrom);
        return validFrom <= now;
      });
    }
    
    visits.value = content;
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (err) {
    // Manejar errores específicos
    if (err.response?.status === 400) {
      error.value = err.response?.data?.message || "RUN inválido";
    } else {
      error.value = "Error al cargar las visitas";
    }
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

// Debounce para búsqueda por RUN (400ms)
const debouncedSearch = debounce(() => {
  page.value = 1;
  loadVisits();
}, 400);

// Watch para búsqueda en vivo por RUN
watch(searchRun, () => {
  debouncedSearch();
});

// Watch para búsqueda en vivo por nombre
watch(searchName, () => {
  debouncedSearch();
});

// Limpiar debounce al desmontar
onUnmounted(() => {
  debouncedSearch.cancel();
});

/**
 * Obtiene el estado de display de la visita
 * Si el status del backend es ACTIVE pero validFrom > ahora → PENDING (aún no válida)
 * Si el status del backend es ACTIVE y validFrom <= ahora → ACTIVE
 * Si el status del backend es EXPIRED → EXPIRED
 */
function getDisplayStatus(visit) {
  if (visit.status === VisitStatus.EXPIRED) {
    return VisitDisplayStatus.EXPIRED;
  }
  
  if (visit.status === VisitStatus.ACTIVE) {
    // Obtener hora actual en Chile (America/Santiago)
    const now = new Date();
    const validFrom = new Date(visit.validFrom);
    
    if (validFrom > now) {
      return VisitDisplayStatus.PENDING; // Aún no es válida
    }
    return VisitDisplayStatus.ACTIVE;
  }
  
  return visit.status;
}

function formatStatus(displayStatus) {
  const statuses = {
    ACTIVE: "Activa",
    EXPIRED: "Expirada",
    PENDING: "Pendiente", // Aún no válida
  };
  return statuses[displayStatus] || displayStatus;
}

function getStatusClass(displayStatus) {
  const classes = {
    ACTIVE: "bg-green-100 text-green-800",
    EXPIRED: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
  };
  return classes[displayStatus] || "bg-gray-100 text-gray-800";
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function handlePageChange(newPage) {
  page.value = newPage;
}

function handleFilterChange() {
  page.value = 1;
  loadVisits();
}

function clearFilters() {
  searchRun.value = "";
  searchName.value = "";
  statusFilter.value = "";
  page.value = 1;
  loadVisits();
}

function toggleMenu(visitId) {
  activeMenuId.value = activeMenuId.value === visitId ? null : visitId;
}

function closeMenu() {
  activeMenuId.value = null;
}

// Formatear fecha para datetime-local
function formatDateTimeLocal(d) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Crear visita
function openCreateModal() {
  // Establecer fecha/hora actual como valor por defecto (hora local de Chile)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Formatear para datetime-local en hora local (no UTC)
  const formatDateTimeLocal = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  createForm.value = {
    run: "",
    fullName: "",
    validFrom: formatDateTimeLocal(now),
    validUntil: formatDateTimeLocal(tomorrow),
  };
  createError.value = "";
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  createError.value = "";
}

async function handleCreateVisit() {
  if (!createForm.value.run || !createForm.value.fullName || !createForm.value.validFrom || !createForm.value.validUntil) {
    createError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isCreating.value = true;
  createError.value = "";
  
  try {
    await createVisit({
      run: createForm.value.run,
      fullName: createForm.value.fullName,
      // Enviar en formato ISO sin convertir a UTC (el backend interpreta como hora local)
      validFrom: createForm.value.validFrom + ":00",
      validUntil: createForm.value.validUntil + ":00",
    });
    closeCreateModal();
    await loadVisits();
  } catch (err) {
    // Manejar errores específicos del backend
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      createError.value = message || "Datos inválidos. Verifique el RUN y los campos.";
    } else if (status === 409) {
      createError.value = message || "El RUN ya existe en el sistema o pertenece a otra entidad.";
    } else {
      createError.value = message || "Error al crear la visita";
    }
    console.error(err);
  } finally {
    isCreating.value = false;
  }
}

// Editar visita
function openEditModal(visit) {
  editingVisit.value = visit;
  editForm.value = {
    fullName: visit.fullName,
    validFrom: formatDateTimeLocal(visit.validFrom),
    validUntil: formatDateTimeLocal(visit.validUntil),
  };
  editError.value = "";
  showEditModal.value = true;
  closeMenu();
}

function closeEditModal() {
  showEditModal.value = false;
  editingVisit.value = null;
  editError.value = "";
}

async function handleEditVisit() {
  if (!editForm.value.fullName || !editForm.value.validFrom || !editForm.value.validUntil) {
    editError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isEditing.value = true;
  editError.value = "";
  
  try {
    await updateVisit(editingVisit.value.id, {
      fullName: editForm.value.fullName,
      // Enviar en formato ISO sin convertir a UTC (el backend interpreta como hora local)
      validFrom: editForm.value.validFrom + ":00",
      validUntil: editForm.value.validUntil + ":00",
    });
    closeEditModal();
    await loadVisits();
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      editError.value = message || "Datos inválidos.";
    } else {
      editError.value = message || "Error al actualizar la visita";
    }
    console.error(err);
  } finally {
    isEditing.value = false;
  }
}

// Eliminar visita
function confirmDelete(visit) {
  deletingVisit.value = visit;
  showDeleteModal.value = true;
  closeMenu();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deletingVisit.value = null;
}

async function handleDeleteVisit() {
  if (!deletingVisit.value) return;
  
  isDeleting.value = true;
  
  try {
    await deleteVisit(deletingVisit.value.id);
    closeDeleteModal();
    await loadVisits();
  } catch (err) {
    error.value = err.response?.data?.message || "Error al eliminar la visita";
    closeDeleteModal();
  } finally {
    isDeleting.value = false;
  }
}

// Watch para cambios de página
watch(page, () => {
  loadVisits();
});

onMounted(() => {
  loadVisits();
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
            <h3 class="text-lg font-semibold text-gray-900">Lista de Visitas</h3>
            <p class="text-sm text-gray-500">Registro de todas las visitas del sistema</p>
          </div>
          
          <!-- Filtros -->
          <div class="flex flex-wrap gap-2">
            <div class="relative">
              <input
                v-model="searchRun"
                type="text"
                placeholder="Buscar por RUN..."
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro pr-8"
              />
              <svg v-if="isLoading && searchRun" class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
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
            <select
              v-model="statusFilter"
              @change="handleFilterChange"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
            >
              <option value="">Todos los estados</option>
              <option :value="VisitStatus.ACTIVE">Activa</option>
              <option :value="VisitDisplayStatus.PENDING">Pendiente</option>
              <option :value="VisitStatus.EXPIRED">Expirada</option>
            </select>
            <button
              @click="clearFilters"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
            <button
              @click="openCreateModal"
              class="px-4 py-2 text-sm font-medium text-white bg-ufro rounded-lg hover:bg-ufro-600 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Crear Visita
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
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                RUN
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Válido Desde
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Válido Hasta
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="visit in visits" :key="visit.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ visit.fullName }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ visit.run }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ formatDate(visit.validFrom) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ formatDate(visit.validUntil) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusClass(getDisplayStatus(visit))
                  ]"
                >
                  {{ formatStatus(getDisplayStatus(visit)) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative action-menu inline-block">
                  <button
                    @click.stop="toggleMenu(visit.id)"
                    class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="activeMenuId === visit.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                  >
                    <button
                      @click="openEditModal(visit)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      @click="confirmDelete(visit)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="visits.length === 0 && !isLoading">
              <td colspan="6" class="px-6 py-12 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No hay visitas</h3>
                <p class="mt-1 text-sm text-gray-500">No se encontraron visitas en el sistema.</p>
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

    <!-- Modal de crear visita -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Crear Nueva Visita</h3>
          <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="createError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ createError }}
        </div>

        <form @submit.prevent="handleCreateVisit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RUN</label>
            <input
              v-model="createForm.run"
              type="text"
              placeholder="12.345.678-9"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              v-model="createForm.fullName"
              type="text"
              placeholder="Juan Pérez González"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Válido Desde</label>
            <input
              v-model="createForm.validFrom"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Válido Hasta</label>
            <input
              v-model="createForm.validUntil"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
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
              {{ isCreating ? 'Creando...' : 'Crear Visita' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de editar visita -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Editar Visita</h3>
          <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="editError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ editError }}
        </div>

        <form @submit.prevent="handleEditVisit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RUN</label>
            <input
              :value="editingVisit?.run"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              v-model="editForm.fullName"
              type="text"
              placeholder="Juan Pérez González"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Válido Desde</label>
            <input
              v-model="editForm.validFrom"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Válido Hasta</label>
            <input
              v-model="editForm.validUntil"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
              required
            />
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

    <!-- Modal de confirmación de eliminación -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Eliminar Visita</h3>
        </div>
        
        <p class="text-sm text-gray-600 mb-2">
          ¿Estás seguro de que deseas eliminar esta visita?
        </p>
        <p class="text-sm text-gray-500 mb-6">
          <strong>{{ deletingVisit?.fullName }}</strong> ({{ deletingVisit?.run }})
        </p>
        
        <div class="flex gap-3">
          <button
            @click="closeDeleteModal"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="handleDeleteVisit"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import { 
  getAccessMarks, 
  deleteAccessMark, 
  bulkDeleteAccessMarks,
  AccessMarkStatus 
} from "@/features/access";
import { cleanForPrefix, debounce } from "@/shared/utils";
import Pagination from "@/components/Pagination.vue";

// Estado de paginación
const page = ref(1);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);

// Filtros
const searchRun = ref("");
const statusFilter = ref("");
const dateFilter = ref("");

// Datos
const accessMarks = ref([]);
const isLoading = ref(false);
const error = ref("");

// Selección múltiple
const selectedIds = ref(new Set());

// Menu de acciones
const activeMenuId = ref(null);

// Modal de confirmación de eliminación
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const deletingMark = ref(null);

// Modal de confirmación bulk delete
const showBulkDeleteModal = ref(false);
const isBulkDeleting = ref(false);

// Toast notification
const toast = ref({ show: false, message: "", type: "success" });

// Computed: marcaciones seleccionadas (objetos completos)
const selectedMarks = computed(() => {
  return accessMarks.value.filter(m => selectedIds.value.has(m.id));
});

// Computed: si todos los de la página están seleccionados
const allSelected = computed(() => {
  if (accessMarks.value.length === 0) return false;
  return accessMarks.value.every(m => selectedIds.value.has(m.id));
});

// Computed: si hay alguno seleccionado (para el checkbox indeterminado)
const someSelected = computed(() => {
  return selectedIds.value.size > 0 && !allSelected.value;
});

function showToast(message, type = "success") {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

async function loadAccessMarks() {
  isLoading.value = true;
  error.value = "";
  
  try {
    const runPrefix = cleanForPrefix(searchRun.value);
    
    const response = await getAccessMarks({
      page: page.value,
      size: size.value,
      runPrefix: runPrefix,
      status: statusFilter.value,
      date: dateFilter.value,
    });
    
    accessMarks.value = response.content || [];
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (err) {
    if (err.response?.status === 400) {
      error.value = err.response?.data?.message || "RUN inválido";
    } else {
      error.value = "Error al cargar las marcaciones";
    }
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

// Debounce para búsqueda por RUN (400ms)
const debouncedSearch = debounce(() => {
  page.value = 1;
  clearSelection();
  loadAccessMarks();
}, 400);

// Watch para búsqueda en vivo por RUN
watch(searchRun, () => {
  debouncedSearch();
});

// Limpiar debounce al desmontar
onUnmounted(() => {
  debouncedSearch.cancel();
});

// === Selección múltiple ===
function toggleSelectAll() {
  if (allSelected.value) {
    accessMarks.value.forEach(m => selectedIds.value.delete(m.id));
  } else {
    accessMarks.value.forEach(m => selectedIds.value.add(m.id));
  }
  selectedIds.value = new Set(selectedIds.value);
}

function toggleSelect(markId) {
  if (selectedIds.value.has(markId)) {
    selectedIds.value.delete(markId);
  } else {
    selectedIds.value.add(markId);
  }
  selectedIds.value = new Set(selectedIds.value);
}

function clearSelection() {
  selectedIds.value = new Set();
}

// === Formatters ===
function formatStatus(status) {
  const statuses = {
    ENTRY: "Entrada",
    EXIT: "Salida",
  };
  return statuses[status] || status;
}

function getStatusClass(status) {
  const classes = {
    ENTRY: "bg-green-100 text-green-800",
    EXIT: "bg-blue-100 text-blue-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
}

function formatDateTime(dateString) {
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
  clearSelection();
}

function handleFilterChange() {
  page.value = 1;
  clearSelection();
  loadAccessMarks();
}

function clearFilters() {
  searchRun.value = "";
  statusFilter.value = "";
  dateFilter.value = "";
  page.value = 1;
  clearSelection();
  loadAccessMarks();
}

function toggleMenu(markId) {
  activeMenuId.value = activeMenuId.value === markId ? null : markId;
}

function closeMenu() {
  activeMenuId.value = null;
}

// === Delete individual ===
function confirmDelete(mark) {
  deletingMark.value = mark;
  showDeleteModal.value = true;
  closeMenu();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deletingMark.value = null;
}

async function handleDeleteMark() {
  if (!deletingMark.value) return;
  
  isDeleting.value = true;
  
  try {
    await deleteAccessMark(deletingMark.value.id);
    closeDeleteModal();
    await loadAccessMarks();
    showToast("Marcación eliminada exitosamente");
  } catch (err) {
    error.value = err.response?.data?.message || "Error al eliminar la marcación";
    closeDeleteModal();
  } finally {
    isDeleting.value = false;
  }
}

// === Bulk delete ===
function openBulkDeleteModal() {
  showBulkDeleteModal.value = true;
}

function closeBulkDeleteModal() {
  showBulkDeleteModal.value = false;
}

async function handleBulkDelete() {
  if (selectedIds.value.size === 0) return;
  
  isBulkDeleting.value = true;
  
  try {
    const ids = Array.from(selectedIds.value);
    const result = await bulkDeleteAccessMarks(ids);
    
    closeBulkDeleteModal();
    clearSelection();
    await loadAccessMarks();
    
    showToast(`${result.deleted || ids.length} marcación(es) eliminada(s)`);
  } catch (err) {
    const message = err.response?.data?.message || "Error al eliminar las marcaciones";
    showToast(message, "error");
    console.error(err);
  } finally {
    isBulkDeleting.value = false;
  }
}

// Watch para cambios de página
watch(page, () => {
  loadAccessMarks();
});

onMounted(() => {
  loadAccessMarks();
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
    <!-- Toast notification -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 translate-y-2"
      enter-to-class="transform opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 translate-y-0"
      leave-to-class="transform opacity-0 translate-y-2"
    >
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        ]"
      >
        <svg v-if="toast.type === 'success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- Card principal -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header de la tabla -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Marcaciones de Acceso</h3>
            <p class="text-sm text-gray-500">Registro de entradas y salidas de visitantes</p>
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
            <select
              v-model="statusFilter"
              @change="handleFilterChange"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
            >
              <option value="">Todos los estados</option>
              <option :value="AccessMarkStatus.ENTRY">Entrada</option>
              <option :value="AccessMarkStatus.EXIT">Salida</option>
            </select>
            <input
              v-model="dateFilter"
              @change="handleFilterChange"
              type="date"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
            />
            <button
              @click="clearFilters"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de selección -->
      <div 
        v-if="selectedIds.size > 0"
        class="px-6 py-3 bg-ufro-50 border-b border-ufro-200 flex items-center justify-between"
      >
        <span class="text-sm font-medium text-ufro-800">
          {{ selectedIds.size }} marcación(es) seleccionada(s)
        </span>
        <div class="flex gap-2">
          <button
            @click="clearSelection"
            class="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50 border border-gray-300 transition-colors"
          >
            Deseleccionar
          </button>
          <button
            @click="openBulkDeleteModal"
            class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar seleccionados
          </button>
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
      <div v-else :class="['overflow-auto', activeMenuId ? 'pb-32' : '']">
        <table class="w-full table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 text-ufro border-gray-300 rounded focus:ring-ufro"
                />
              </th>
              <th class="w-[20%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                RUN
              </th>
              <th class="w-[25%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Entrada
              </th>
              <th class="w-[25%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Salida
              </th>
              <th class="w-[15%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="w-20 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr 
              v-for="mark in accessMarks" 
              :key="mark.id" 
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'bg-ufro-50': selectedIds.has(mark.id) }"
            >
              <td class="px-4 py-4">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(mark.id)"
                  @change="toggleSelect(mark.id)"
                  class="w-4 h-4 text-ufro border-gray-300 rounded focus:ring-ufro"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ mark.run }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ formatDateTime(mark.entryTime) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ formatDateTime(mark.exitTime) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusClass(mark.status)
                  ]"
                >
                  {{ formatStatus(mark.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative action-menu inline-block">
                  <button
                    @click.stop="toggleMenu(mark.id)"
                    class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="activeMenuId === mark.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                  >
                    <button
                      @click="confirmDelete(mark)"
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
            <tr v-if="accessMarks.length === 0 && !isLoading">
              <td colspan="6" class="px-6 py-12 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No hay marcaciones</h3>
                <p class="mt-1 text-sm text-gray-500">No se encontraron marcaciones de acceso.</p>
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

    <!-- Modal de confirmación de eliminación individual -->
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
          <h3 class="text-lg font-semibold text-gray-900">Eliminar Marcación</h3>
        </div>
        
        <p class="text-sm text-gray-600 mb-2">
          ¿Estás seguro de que deseas eliminar esta marcación?
        </p>
        <p class="text-sm text-gray-500 mb-6">
          <strong>{{ deletingMark?.run }}</strong> - {{ formatStatus(deletingMark?.status) }} ({{ formatDateTime(deletingMark?.entryTime) }})
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
            @click="handleDeleteMark"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación bulk delete -->
    <div
      v-if="showBulkDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Eliminar Marcaciones</h3>
        </div>
        
        <p class="text-sm text-gray-600 mb-2">
          ¿Estás seguro de que deseas eliminar las marcaciones seleccionadas?
        </p>
        <p class="text-sm text-gray-500 mb-6">
          Se eliminarán <strong>{{ selectedIds.size }}</strong> marcación(es) de forma permanente.
        </p>
        
        <div class="flex gap-3">
          <button
            @click="closeBulkDeleteModal"
            :disabled="isBulkDeleting"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="handleBulkDelete"
            :disabled="isBulkDeleting"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isBulkDeleting ? 'Eliminando...' : 'Eliminar todo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

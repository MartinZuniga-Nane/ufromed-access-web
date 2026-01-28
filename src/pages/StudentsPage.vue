<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { getStudents, createStudent, updateStudent, StudentStatus } from "@/features/students";
import { cleanForPrefix, debounce } from "@/shared/utils";
import Pagination from "@/components/Pagination.vue";

// Estado de paginación
const page = ref(1);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);

// Filtros
const searchRun = ref("");
const filters = ref({
  status: "",
});

// Datos
const students = ref([]);
const isLoading = ref(false);
const error = ref("");

// Menu de acciones
const activeMenuId = ref(null);

// Modal de crear estudiante
const showCreateModal = ref(false);
const isCreating = ref(false);
const createForm = ref({
  run: "",
  firstName: "",
  lastName: "",
  status: StudentStatus.AUTHORIZED,
});
const createError = ref("");

// Modal de editar estudiante
const showEditModal = ref(false);
const isEditing = ref(false);
const editingStudent = ref(null);
const editForm = ref({
  firstName: "",
  lastName: "",
  status: StudentStatus.AUTHORIZED,
});
const editError = ref("");

async function loadStudents() {
  isLoading.value = true;
  error.value = "";
  
  try {
    // Sanitizar el input de búsqueda removiendo puntos y guiones
    const runPrefix = cleanForPrefix(searchRun.value);
    
    const response = await getStudents({
      page: page.value,
      size: size.value,
      runPrefix: runPrefix,
      status: filters.value.status,
    });
    students.value = response.content || [];
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (err) {
    // Manejar errores específicos
    if (err.response?.status === 400) {
      error.value = err.response?.data?.message || "RUN inválido";
    } else {
      error.value = "Error al cargar los alumnos";
    }
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

// Debounce para búsqueda por RUN (400ms)
const debouncedSearch = debounce(() => {
  page.value = 1;
  loadStudents();
}, 400);

// Watch para búsqueda en vivo por RUN
watch(searchRun, () => {
  debouncedSearch();
});

// Limpiar debounce al desmontar
onUnmounted(() => {
  debouncedSearch.cancel();
});

// Obtener nombre completo concatenando firstName y lastName
function getFullName(student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function formatStatus(status) {
  const statuses = {
    AUTHORIZED: "Autorizado",
    NOT_AUTHORIZED: "No Autorizado",
  };
  return statuses[status] || status;
}

function getStatusClass(status) {
  const classes = {
    AUTHORIZED: "bg-green-100 text-green-800",
    NOT_AUTHORIZED: "bg-red-100 text-red-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
}

function handlePageChange(newPage) {
  page.value = newPage;
}

function handleFilterChange() {
  page.value = 1;
  loadStudents();
}

function clearFilters() {
  searchRun.value = "";
  filters.value = { status: "" };
  page.value = 1;
  loadStudents();
}

function toggleMenu(studentId) {
  activeMenuId.value = activeMenuId.value === studentId ? null : studentId;
}

function closeMenu() {
  activeMenuId.value = null;
}

// Crear estudiante
function openCreateModal() {
  createForm.value = {
    run: "",
    firstName: "",
    lastName: "",
    status: StudentStatus.AUTHORIZED,
  };
  createError.value = "";
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  createError.value = "";
}

async function handleCreateStudent() {
  if (!createForm.value.run || !createForm.value.firstName || !createForm.value.lastName) {
    createError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isCreating.value = true;
  createError.value = "";
  
  try {
    await createStudent(createForm.value);
    closeCreateModal();
    await loadStudents();
  } catch (err) {
    // Manejar errores específicos del backend
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      createError.value = message || "Datos inválidos. Verifique el RUN y los campos.";
    } else if (status === 409) {
      createError.value = message || "El RUN ya existe en el sistema o pertenece a otra entidad.";
    } else {
      createError.value = message || "Error al crear el alumno";
    }
    console.error(err);
  } finally {
    isCreating.value = false;
  }
}

// Editar estudiante
function openEditModal(student) {
  editingStudent.value = student;
  editForm.value = {
    firstName: student.firstName,
    lastName: student.lastName,
    status: student.status,
  };
  editError.value = "";
  showEditModal.value = true;
  closeMenu();
}

function closeEditModal() {
  showEditModal.value = false;
  editingStudent.value = null;
  editError.value = "";
}

async function handleEditStudent() {
  if (!editForm.value.firstName || !editForm.value.lastName) {
    editError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isEditing.value = true;
  editError.value = "";
  
  try {
    await updateStudent(editingStudent.value.id, editForm.value);
    closeEditModal();
    await loadStudents();
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400) {
      editError.value = message || "Datos inválidos.";
    } else {
      editError.value = message || "Error al actualizar el alumno";
    }
    console.error(err);
  } finally {
    isEditing.value = false;
  }
}

// Watch para cambios de página
watch(page, () => {
  loadStudents();
});

onMounted(() => {
  loadStudents();
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
            <h3 class="text-lg font-semibold text-gray-900">Lista de Alumnos</h3>
            <p class="text-sm text-gray-500">Gestión de todos los alumnos del sistema</p>
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
              v-model="filters.status"
              @change="handleFilterChange"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
            >
              <option value="">Todos los estados</option>
              <option :value="StudentStatus.AUTHORIZED">Autorizado</option>
              <option :value="StudentStatus.NOT_AUTHORIZED">No Autorizado</option>
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
              Crear Alumno
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
                Estado
              </th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="student in students" :key="student.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ getFullName(student) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">{{ student.run }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusClass(student.status)
                  ]"
                >
                  {{ formatStatus(student.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative action-menu inline-block">
                  <button
                    @click.stop="toggleMenu(student.id)"
                    class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="activeMenuId === student.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                  >
                    <button
                      @click="openEditModal(student)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="students.length === 0 && !isLoading">
              <td colspan="5" class="px-6 py-12 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No hay alumnos</h3>
                <p class="mt-1 text-sm text-gray-500">No se encontraron alumnos en el sistema.</p>
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

    <!-- Modal de crear alumno -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Crear Nuevo Alumno</h3>
          <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="createError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ createError }}
        </div>

        <form @submit.prevent="handleCreateStudent" class="space-y-4">
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

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                v-model="createForm.firstName"
                type="text"
                placeholder="Juan"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input
                v-model="createForm.lastName"
                type="text"
                placeholder="Pérez González"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              v-model="createForm.status"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
              required
            >
              <option :value="StudentStatus.AUTHORIZED">Autorizado</option>
              <option :value="StudentStatus.NOT_AUTHORIZED">No Autorizado</option>
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
              {{ isCreating ? 'Creando...' : 'Crear Alumno' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de editar alumno -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Editar Alumno</h3>
          <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="editError" class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {{ editError }}
        </div>

        <form @submit.prevent="handleEditStudent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RUN</label>
            <input
              :value="editingStudent?.run"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                v-model="editForm.firstName"
                type="text"
                placeholder="Juan"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input
                v-model="editForm.lastName"
                type="text"
                placeholder="Pérez González"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              v-model="editForm.status"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufro focus:border-ufro bg-white"
              required
            >
              <option :value="StudentStatus.AUTHORIZED">Autorizado</option>
              <option :value="StudentStatus.NOT_AUTHORIZED">No Autorizado</option>
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
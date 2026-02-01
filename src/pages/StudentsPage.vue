<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import { 
  getStudents, 
  createStudent, 
  updateStudent, 
  authorizeStudent,
  unauthorizeStudent,
  bulkUpdateStatus,
  importStudentsFromExcel,
  StudentStatus 
} from "@/features/students";
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
const filters = ref({
  status: "",
});

// Datos
const students = ref([]);
const isLoading = ref(false);
const error = ref("");

// Selección múltiple
const selectedIds = ref(new Set());

// Menu de acciones
const activeMenuId = ref(null);

// Modal de crear estudiante
const showCreateModal = ref(false);
const isCreating = ref(false);
const createForm = ref({
  run: "",
  fullName: "",
  status: StudentStatus.AUTHORIZED,
});
const createError = ref("");

// Modal de editar estudiante
const showEditModal = ref(false);
const isEditing = ref(false);
const editingStudent = ref(null);
const editForm = ref({
  fullName: "",
  status: StudentStatus.AUTHORIZED,
});
const editError = ref("");

// Modal de importar Excel
const showImportModal = ref(false);
const isImporting = ref(false);
const importFile = ref(null);
const importError = ref("");
const importResult = ref(null);
const isDragging = ref(false);

// Modal de confirmación bulk
const showBulkConfirmModal = ref(false);
const showBulkAuthorizeModal = ref(false);
const isBulkUpdating = ref(false);

// Modal de confirmación individual
const showConfirmModal = ref(false);
const confirmAction = ref(null); // 'authorize' | 'unauthorize'
const confirmStudent = ref(null);
const isConfirming = ref(false);

// Toast notification
const toast = ref({ show: false, message: "", type: "success" });

// Computed: estudiantes seleccionados (objetos completos)
const selectedStudents = computed(() => {
  return students.value.filter(s => selectedIds.value.has(s.id));
});

// Computed: seleccionados separados por estado
const selectedAuthorized = computed(() => {
  return selectedStudents.value.filter(s => s.status === StudentStatus.AUTHORIZED);
});

const selectedUnauthorized = computed(() => {
  return selectedStudents.value.filter(s => s.status === StudentStatus.NOT_AUTHORIZED);
});

// Computed: si todos los de la página están seleccionados
const allSelected = computed(() => {
  if (students.value.length === 0) return false;
  return students.value.every(s => selectedIds.value.has(s.id));
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

async function loadStudents() {
  isLoading.value = true;
  error.value = "";
  
  try {
    const runPrefix = cleanForPrefix(searchRun.value);
    const namePrefix = searchName.value.trim();
    
    const response = await getStudents({
      page: page.value,
      size: size.value,
      runPrefix: runPrefix,
      namePrefix: namePrefix,
      status: filters.value.status,
    });
    
    students.value = response.content || [];
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (err) {
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
  clearSelection();
  loadStudents();
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

// === Selección múltiple ===
function toggleSelectAll() {
  if (allSelected.value) {
    // Deseleccionar todos los de la página actual
    students.value.forEach(s => selectedIds.value.delete(s.id));
  } else {
    // Seleccionar todos los de la página actual
    students.value.forEach(s => selectedIds.value.add(s.id));
  }
  // Forzar reactividad
  selectedIds.value = new Set(selectedIds.value);
}

function toggleSelect(studentId) {
  if (selectedIds.value.has(studentId)) {
    selectedIds.value.delete(studentId);
  } else {
    selectedIds.value.add(studentId);
  }
  // Forzar reactividad
  selectedIds.value = new Set(selectedIds.value);
}

function clearSelection() {
  selectedIds.value = new Set();
}

function clearAuthorizedSelection() {
  selectedAuthorized.value.forEach(s => selectedIds.value.delete(s.id));
  selectedIds.value = new Set(selectedIds.value);
}

function clearUnauthorizedSelection() {
  selectedUnauthorized.value.forEach(s => selectedIds.value.delete(s.id));
  selectedIds.value = new Set(selectedIds.value);
}

function removeFromSelection(studentId) {
  selectedIds.value.delete(studentId);
  selectedIds.value = new Set(selectedIds.value);
}

// === Bulk actions ===
function openBulkConfirmModal() {
  showBulkConfirmModal.value = true;
}

function closeBulkConfirmModal() {
  showBulkConfirmModal.value = false;
}

function openBulkAuthorizeModal() {
  showBulkAuthorizeModal.value = true;
}

function closeBulkAuthorizeModal() {
  showBulkAuthorizeModal.value = false;
}

async function handleBulkUnauthorize() {
  if (selectedAuthorized.value.length === 0) return;
  
  isBulkUpdating.value = true;
  
  try {
    const ids = selectedAuthorized.value.map(s => s.id);
    await bulkUpdateStatus(ids, StudentStatus.NOT_AUTHORIZED);
    
    // Solo remover los IDs procesados, mantener las otras selecciones
    ids.forEach(id => selectedIds.value.delete(id));
    selectedIds.value = new Set(selectedIds.value);
    
    closeBulkConfirmModal();
    await loadStudents();
    
    showToast(`${ids.length} alumno(s) marcados como No Autorizado`, "success");
  } catch (err) {
    const message = err.response?.data?.message || "Error al actualizar los alumnos";
    showToast(message, "error");
    console.error(err);
  } finally {
    isBulkUpdating.value = false;
  }
}

async function handleBulkAuthorize() {
  if (selectedUnauthorized.value.length === 0) return;
  
  isBulkUpdating.value = true;
  
  try {
    const ids = selectedUnauthorized.value.map(s => s.id);
    await bulkUpdateStatus(ids, StudentStatus.AUTHORIZED);
    
    // Solo remover los IDs procesados, mantener las otras selecciones
    ids.forEach(id => selectedIds.value.delete(id));
    selectedIds.value = new Set(selectedIds.value);
    
    closeBulkAuthorizeModal();
    await loadStudents();
    
    showToast(`${ids.length} alumno(s) marcados como Autorizado`, "success");
  } catch (err) {
    const message = err.response?.data?.message || "Error al actualizar los alumnos";
    showToast(message, "error");
    console.error(err);
  } finally {
    isBulkUpdating.value = false;
  }
}

// === Acciones individuales con confirmación ===
function confirmAuthorize(student) {
  confirmStudent.value = student;
  confirmAction.value = 'authorize';
  showConfirmModal.value = true;
  closeMenu();
}

function confirmUnauthorize(student) {
  confirmStudent.value = student;
  confirmAction.value = 'unauthorize';
  showConfirmModal.value = true;
  closeMenu();
}

function closeConfirmModal() {
  showConfirmModal.value = false;
  confirmAction.value = null;
  confirmStudent.value = null;
  isConfirming.value = false;
}

async function executeConfirmedAction() {
  if (!confirmAction.value || !confirmStudent.value) return;
  
  isConfirming.value = true;
  
  try {
    if (confirmAction.value === 'authorize') {
      await authorizeStudent(confirmStudent.value.id);
      showToast(`${confirmStudent.value.fullName} autorizado`, "success");
    } else if (confirmAction.value === 'unauthorize') {
      await unauthorizeStudent(confirmStudent.value.id);
      showToast(`${confirmStudent.value.fullName} desautorizado`, "success");
    }
    await loadStudents();
    closeConfirmModal();
  } catch (err) {
    const message = err.response?.data?.message || 
      (confirmAction.value === 'authorize' ? "Error al autorizar" : "Error al desautorizar");
    showToast(message, "error");
    console.error(err);
    closeConfirmModal();
  }
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
  clearSelection();
}

function handleFilterChange() {
  page.value = 1;
  clearSelection();
  loadStudents();
}

function clearFilters() {
  searchRun.value = "";
  searchName.value = "";
  filters.value = { status: "" };
  page.value = 1;
  clearSelection();
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
    fullName: "",
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
  if (!createForm.value.run || !createForm.value.fullName) {
    createError.value = "Todos los campos son obligatorios";
    return;
  }
  
  isCreating.value = true;
  createError.value = "";
  
  try {
    await createStudent(createForm.value);
    closeCreateModal();
    await loadStudents();
    showToast("Alumno creado exitosamente", "success");
  } catch (err) {
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
    fullName: student.fullName,
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
  if (!editForm.value.fullName) {
    editError.value = "El nombre completo es obligatorio";
    return;
  }
  
  isEditing.value = true;
  editError.value = "";
  
  try {
    await updateStudent(editingStudent.value.id, editForm.value);
    closeEditModal();
    await loadStudents();
    showToast("Alumno actualizado exitosamente", "success");
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

// === Importar Excel ===
function openImportModal() {
  importFile.value = null;
  importError.value = "";
  importResult.value = null;
  showImportModal.value = true;
}

function closeImportModal() {
  showImportModal.value = false;
  importFile.value = null;
  importError.value = "";
  importResult.value = null;
  isDragging.value = false;
}

function validateXlsxFile(file) {
  if (!file) return false;
  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const validExtension = file.name.toLowerCase().endsWith(".xlsx");
  return validTypes.includes(file.type) || validExtension;
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) {
    if (validateXlsxFile(file)) {
      importFile.value = file;
      importError.value = "";
    } else {
      importFile.value = null;
      importError.value = "Solo se permiten archivos Excel (.xlsx)";
    }
  }
}

function handleDragOver(event) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(event) {
  event.preventDefault();
  isDragging.value = false;
}

function handleDrop(event) {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    if (validateXlsxFile(file)) {
      importFile.value = file;
      importError.value = "";
    } else {
      importFile.value = null;
      importError.value = "Solo se permiten archivos Excel (.xlsx)";
    }
  }
}

function removeSelectedFile() {
  importFile.value = null;
  importError.value = "";
}

async function handleImportStudents() {
  if (!importFile.value) return;
  
  isImporting.value = true;
  importError.value = "";
  
  try {
    const result = await importStudentsFromExcel(importFile.value);
    importResult.value = result;
    await loadStudents();
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || "Error al importar el archivo";
    importError.value = message;
    console.error(err);
  } finally {
    isImporting.value = false;
  }
}

// Computed para filtrar solo errores de RUT inválido
const invalidRutErrors = computed(() => {
  if (!importResult.value?.errors) return [];
  return importResult.value.errors.filter(err => err.reason === "RUT inválido");
});

// Función para descargar todos los errores como TXT
function downloadErrorsTxt() {
  if (!importResult.value) return;
  
  const result = importResult.value;
  let content = "=== REPORTE DE IMPORTACIÓN DE ALUMNOS ===\n";
  content += `Fecha: ${new Date().toLocaleString('es-CL')}\n\n`;
  
  content += "--- RESUMEN ---\n";
  content += `Filas leídas: ${result.totalRowsRead}\n`;
  content += `Insertados correctamente: ${result.inserted}\n`;
  content += `RUT inválido: ${result.invalidRut}\n`;
  content += `Nombre inválido: ${result.invalidName}\n`;
  content += `Duplicados en archivo: ${result.duplicateInFile}\n`;
  content += `Ya existentes en alumnos: ${result.duplicateInStudents}\n`;
  content += `Ya existentes en visitas: ${result.crossInVisits}\n`;
  content += `Ya existentes en usuarios: ${result.crossInUsers}\n\n`;
  
  if (result.errors && result.errors.length > 0) {
    content += "--- DETALLE DE ERRORES ---\n";
    content += `Total de errores: ${result.errors.length}\n\n`;
    
    result.errors.forEach((err, index) => {
      content += `[${index + 1}] Fila ${err.row}\n`;
      content += `    Razón: ${err.reason}\n`;
      if (err.rutRaw) content += `    RUT original: ${err.rutRaw}\n`;
      if (err.rutNormalized) content += `    RUT normalizado: ${err.rutNormalized}\n`;
      if (err.nameRaw) content += `    Nombre: ${err.nameRaw}\n`;
      content += "\n";
    });
  } else {
    content += "--- No se registraron errores ---\n";
  }
  
  // Crear y descargar archivo
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `errores_importacion_${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    <!-- Toast notification -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium',
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        ]"
      >
        {{ toast.message }}
      </div>
    </Transition>

    <!-- Sección de seleccionados -->
    <div v-if="selectedIds.size > 0" class="mb-4 space-y-3">
      <!-- Header con total -->
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-semibold text-gray-900">{{ selectedIds.size }} alumno(s) seleccionado(s) en total</span>
      </div>

      <!-- Sección de Autorizados (para desautorizar) -->
      <div v-if="selectedAuthorized.length > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Autorizados
            </span>
            <span class="text-sm text-green-700">{{ selectedAuthorized.length }} alumno(s)</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="clearAuthorizedSelection"
              class="px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
            >
              Limpiar
            </button>
            <button
              @click="openBulkConfirmModal"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Marcar como No Autorizado
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="student in selectedAuthorized"
            :key="student.id"
            class="inline-flex items-center gap-2 px-3 py-1 bg-white border border-green-200 rounded-full text-sm"
          >
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span class="text-gray-700">{{ student.fullName }}</span>
            <span class="text-gray-400 text-xs">({{ student.run }})</span>
            <button
              @click="removeFromSelection(student.id)"
              class="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Sección de No Autorizados (para autorizar) -->
      <div v-if="selectedUnauthorized.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              No Autorizados
            </span>
            <span class="text-sm text-red-700">{{ selectedUnauthorized.length }} alumno(s)</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="clearUnauthorizedSelection"
              class="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Limpiar
            </button>
            <button
              @click="openBulkAuthorizeModal"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marcar como Autorizado
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="student in selectedUnauthorized"
            :key="student.id"
            class="inline-flex items-center gap-2 px-3 py-1 bg-white border border-red-200 rounded-full text-sm"
          >
            <span class="w-2 h-2 bg-red-500 rounded-full"></span>
            <span class="text-gray-700">{{ student.fullName }}</span>
            <span class="text-gray-400 text-xs">({{ student.run }})</span>
            <button
              @click="removeFromSelection(student.id)"
              class="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

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
              @click="openImportModal"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar Excel
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
        <table class="w-full table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-12 px-6 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 text-ufro border-gray-300 rounded focus:ring-ufro cursor-pointer"
                />
              </th>
              <th class="w-1/3 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th class="w-1/4 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                RUN
              </th>
              <th class="w-1/5 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="w-24 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr 
              v-for="student in students" 
              :key="student.id" 
              :class="[
                'transition-colors',
                selectedIds.has(student.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
              ]"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(student.id)"
                  @change="toggleSelect(student.id)"
                  class="w-4 h-4 text-ufro border-gray-300 rounded focus:ring-ufro cursor-pointer"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ student.fullName }}</div>
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
                    
                    <!-- Autorizar (solo si está NOT_AUTHORIZED) -->
                    <button
                      v-if="student.status === StudentStatus.NOT_AUTHORIZED"
                      @click="confirmAuthorize(student)"
                      class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Autorizar
                    </button>
                    
                    <!-- Desautorizar (solo si está AUTHORIZED) -->
                    <button
                      v-if="student.status === StudentStatus.AUTHORIZED"
                      @click="confirmUnauthorize(student)"
                      class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Desautorizar
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

    <!-- Modal de confirmación bulk -->
    <div
      v-if="showBulkConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Confirmar acción</h3>
            <p class="text-sm text-gray-500">Esta acción no se puede deshacer fácilmente</p>
          </div>
        </div>

        <p class="text-gray-600 mb-6">
          ¿Está seguro que desea marcar <strong>{{ selectedAuthorized.length }} alumno(s)</strong> como <strong class="text-red-600">No Autorizado</strong>?
        </p>

        <div class="flex gap-3">
          <button
            @click="closeBulkConfirmModal"
            :disabled="isBulkUpdating"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="handleBulkUnauthorize"
            :disabled="isBulkUpdating"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg v-if="isBulkUpdating" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isBulkUpdating ? 'Procesando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación bulk autorizar -->
    <div
      v-if="showBulkAuthorizeModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Confirmar autorización</h3>
            <p class="text-sm text-gray-500">Se autorizarán los alumnos seleccionados</p>
          </div>
        </div>

        <p class="text-gray-600 mb-6">
          ¿Está seguro que desea marcar <strong>{{ selectedUnauthorized.length }} alumno(s)</strong> como <strong class="text-green-600">Autorizado</strong>?
        </p>

        <div class="flex gap-3">
          <button
            @click="closeBulkAuthorizeModal"
            :disabled="isBulkUpdating"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="handleBulkAuthorize"
            :disabled="isBulkUpdating"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg v-if="isBulkUpdating" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isBulkUpdating ? 'Procesando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación individual -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-4 mb-4">
          <div 
            :class="[
              'w-12 h-12 rounded-full flex items-center justify-center',
              confirmAction === 'authorize' ? 'bg-green-100' : 'bg-red-100'
            ]"
          >
            <svg 
              v-if="confirmAction === 'authorize'" 
              class="w-6 h-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg 
              v-else 
              class="w-6 h-6 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ confirmAction === 'authorize' ? 'Autorizar Alumno' : 'Desautorizar Alumno' }}
            </h3>
            <p class="text-sm text-gray-500">Esta acción cambiará el estado del alumno</p>
          </div>
        </div>

        <p class="text-gray-600 mb-6">
          ¿Está seguro que desea 
          <strong :class="confirmAction === 'authorize' ? 'text-green-600' : 'text-red-600'">
            {{ confirmAction === 'authorize' ? 'autorizar' : 'desautorizar' }}
          </strong> 
          a <strong>{{ confirmStudent?.fullName }}</strong>?
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
              'flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
              confirmAction === 'authorize' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            ]"
          >
            <svg v-if="isConfirming" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isConfirming ? 'Procesando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
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

    <!-- Modal de importar Excel -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Importar Alumnos desde Excel</h3>
          <button @click="closeImportModal" :disabled="isImporting" class="text-gray-400 hover:text-gray-600 disabled:opacity-50">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mostrar resultado de importación -->
        <div v-if="importResult" class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-semibold text-green-800">Importación completada</span>
            </div>
            <div class="text-sm text-gray-700 space-y-1">
              <p><strong>Filas leídas:</strong> {{ importResult.totalRowsRead }}</p>
              <p><strong class="text-green-700">Insertados:</strong> {{ importResult.inserted }}</p>
              <p v-if="importResult.invalidRut > 0"><strong class="text-red-600">RUT inválido:</strong> {{ importResult.invalidRut }}</p>
              <p v-if="importResult.invalidName > 0"><strong class="text-red-600">Nombre inválido:</strong> {{ importResult.invalidName }}</p>
              <p v-if="importResult.duplicateInFile > 0"><strong class="text-yellow-600">Duplicados en archivo:</strong> {{ importResult.duplicateInFile }}</p>
              <p v-if="importResult.duplicateInStudents > 0"><strong class="text-yellow-600">Ya existentes en alumnos:</strong> {{ importResult.duplicateInStudents }}</p>
              <p v-if="importResult.crossInVisits > 0"><strong class="text-yellow-600">Ya existentes en visitas:</strong> {{ importResult.crossInVisits }}</p>
              <p v-if="importResult.crossInUsers > 0"><strong class="text-yellow-600">Ya existentes en usuarios:</strong> {{ importResult.crossInUsers }}</p>
            </div>
          </div>

          <!-- Lista de errores de RUT inválido -->
          <div v-if="importResult.invalidRut > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-semibold text-red-800">RUT inválidos ({{ importResult.invalidRut }})</span>
              </div>
            </div>
            <div v-if="invalidRutErrors.length > 0" class="max-h-40 overflow-y-auto">
              <ul class="text-sm text-red-700 space-y-1">
                <li v-for="(err, index) in invalidRutErrors" :key="index" class="flex gap-2 flex-wrap">
                  <span v-if="err.rutRaw" class="text-gray-600">RUT: {{ err.rutRaw }}</span>
                  <span v-if="err.nameRaw" class="text-gray-500">- {{ err.nameRaw }}</span>
                </li>
              </ul>
            </div>
            <p v-if="invalidRutErrors.length < importResult.invalidRut" class="text-xs text-red-600 mt-2 italic">
              Mostrando {{ invalidRutErrors.length }} de {{ importResult.invalidRut }} errores. Descarga el archivo para ver todos.
            </p>
            <p v-else-if="invalidRutErrors.length === 0" class="text-xs text-red-600 italic">
              Descarga el archivo de errores para ver el detalle.
            </p>
          </div>

          <!-- Botón para descargar todos los errores -->
          <div v-if="importResult.errors && importResult.errors.length > 0" class="flex justify-center">
            <button
              @click="downloadErrorsTxt"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar todos los errores (.txt)
            </button>
          </div>

          <div class="flex justify-end pt-2">
            <button
              @click="closeImportModal"
              class="px-4 py-2 text-sm font-medium text-white bg-ufro rounded-lg hover:bg-ufro-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        <!-- Formulario de importación -->
        <div v-else class="space-y-4">
          <!-- Error de validación -->
          <div v-if="importError" class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {{ importError }}
          </div>

          <!-- Zona de drag & drop -->
          <div
            @dragover="!isImporting && handleDragOver($event)"
            @dragleave="!isImporting && handleDragLeave($event)"
            @drop="!isImporting && handleDrop($event)"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isImporting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              isDragging && !isImporting ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
              importFile ? 'border-green-500 bg-green-50' : ''
            ]"
            @click="!isImporting && $refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              @change="handleFileSelect"
              class="hidden"
            />

            <!-- Icono y texto cuando no hay archivo -->
            <div v-if="!importFile" class="space-y-3">
              <div class="flex justify-center">
                <svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p class="text-gray-700 font-medium">Selecciona un archivo</p>
                <p class="text-sm text-gray-500 mt-1">Toca para seleccionar un archivo de tu dispositivo.</p>
              </div>
              <p class="text-xs text-gray-400">Solo archivos .xlsx</p>
            </div>

            <!-- Archivo seleccionado -->
            <div v-else class="space-y-3">
              <div class="flex justify-center">
                <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-gray-900 font-medium">{{ importFile.name }}</p>
                <p class="text-sm text-gray-500">{{ (importFile.size / 1024).toFixed(1) }} KB</p>
              </div>
              <button
                @click.stop="removeSelectedFile"
                :disabled="isImporting"
                class="text-sm text-red-600 hover:text-red-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Quitar archivo
              </button>
            </div>
          </div>

          <!-- Información adicional -->
          <p class="text-xs text-gray-500 text-center">
            El archivo debe tener columnas "RUT" y "Nombre". Los alumnos se crearán como Autorizados.
          </p>

          <!-- Botones -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="closeImportModal"
              :disabled="isImporting"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="handleImportStudents"
              :disabled="!importFile || isImporting"
              :class="[
                'flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2',
                !importFile || isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              ]"
            >
              <svg v-if="isImporting" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ isImporting ? 'Importando...' : 'Importar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

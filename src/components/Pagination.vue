<script setup>
import { ref, computed, nextTick } from 'vue';

/**
 * Componente de paginación reutilizable
 * 
 * Props:
 * - page: Página actual (1-based)
 * - totalPages: Total de páginas
 * - totalElements: Total de elementos (opcional, para mostrar info)
 * - size: Tamaño de página (opcional, para mostrar info)
 * 
 * Emits:
 * - change: Emitido cuando se cambia de página (newPage)
 */
const props = defineProps({
  page: {
    type: Number,
    required: true,
    validator: (value) => value >= 1,
  },
  totalPages: {
    type: Number,
    required: true,
    validator: (value) => value >= 0,
  },
  totalElements: {
    type: Number,
    default: null,
  },
  size: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["change"]);

// Estado para el input de salto de página
const showJumpInputLeft = ref(false);
const showJumpInputRight = ref(false);
const jumpPageValue = ref("");
const jumpInputLeftRef = ref(null);
const jumpInputRightRef = ref(null);

function goToPage(newPage) {
  emit("change", newPage);
}

// Computed para determinar qué páginas mostrar
const visiblePages = computed(() => {
  const pages = [];
  const total = props.totalPages;
  const current = props.page;
  
  if (total <= 7) {
    // Si hay 7 o menos páginas, mostrar todas
    for (let i = 1; i <= total; i++) {
      pages.push({ type: 'page', value: i });
    }
  } else {
    // Siempre mostrar página 1
    pages.push({ type: 'page', value: 1 });
    
    // Determinar si necesitamos ellipsis izquierdo
    if (current > 4) {
      pages.push({ type: 'ellipsis', position: 'left' });
    }
    
    // Páginas del medio
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    
    // Ajustar para mostrar al menos 3 páginas en el medio cuando estamos cerca de los extremos
    if (current <= 4) {
      start = 2;
      end = Math.min(5, total - 1);
    } else if (current >= total - 3) {
      start = Math.max(2, total - 4);
      end = total - 1;
    }
    
    for (let i = start; i <= end; i++) {
      pages.push({ type: 'page', value: i });
    }
    
    // Determinar si necesitamos ellipsis derecho
    if (current < total - 3) {
      pages.push({ type: 'ellipsis', position: 'right' });
    }
    
    // Siempre mostrar última página
    pages.push({ type: 'page', value: total });
  }
  
  return pages;
});

function openJumpInput(position) {
  jumpPageValue.value = "";
  if (position === 'left') {
    showJumpInputLeft.value = true;
    showJumpInputRight.value = false;
    nextTick(() => {
      jumpInputLeftRef.value?.focus();
    });
  } else {
    showJumpInputRight.value = true;
    showJumpInputLeft.value = false;
    nextTick(() => {
      jumpInputRightRef.value?.focus();
    });
  }
}

function closeJumpInput() {
  showJumpInputLeft.value = false;
  showJumpInputRight.value = false;
  jumpPageValue.value = "";
}

function handleJumpSubmit() {
  const pageNum = parseInt(jumpPageValue.value, 10);
  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= props.totalPages) {
    goToPage(pageNum);
  }
  closeJumpInput();
}

function handleJumpKeydown(event) {
  if (event.key === 'Enter') {
    handleJumpSubmit();
  } else if (event.key === 'Escape') {
    closeJumpInput();
  }
}

function handleJumpBlur() {
  // Pequeño delay para permitir click en el input
  setTimeout(() => {
    closeJumpInput();
  }, 150);
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
    <!-- Info de resultados -->
    <div v-if="totalElements !== null && size !== null" class="text-sm text-gray-500">
      Mostrando 
      <span class="font-medium text-gray-700">{{ Math.min((page - 1) * size + 1, totalElements) }}</span>
      a 
      <span class="font-medium text-gray-700">{{ Math.min(page * size, totalElements) }}</span>
      de 
      <span class="font-medium text-gray-700">{{ totalElements }}</span>
      resultados
    </div>
    
    <div v-else class="text-sm text-gray-500">
      Página <span class="font-medium text-gray-700">{{ page }}</span> de <span class="font-medium text-gray-700">{{ totalPages }}</span>
    </div>

    <!-- Controles de navegación -->
    <div class="flex items-center gap-2">
      <!-- Botón Anterior -->
      <button
        @click="goToPage(page - 1)"
        :disabled="page <= 1"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ufro focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Anterior
      </button>

      <!-- Números de página (solo en pantallas medianas y grandes) -->
      <div class="hidden md:flex items-center gap-1">
        <template v-for="(item, index) in visiblePages" :key="index">
          <!-- Página normal -->
          <button
            v-if="item.type === 'page'"
            @click="goToPage(item.value)"
            :class="[
              'px-3 py-2 text-sm font-medium rounded-lg transition-colors min-w-[40px]',
              item.value === page
                ? 'bg-ufro text-white'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            {{ item.value }}
          </button>
          
          <!-- Ellipsis clickeable (izquierdo) -->
          <div v-else-if="item.type === 'ellipsis' && item.position === 'left'" class="relative">
            <button
              v-if="!showJumpInputLeft"
              @click="openJumpInput('left')"
              class="px-2 py-2 text-gray-400 hover:text-ufro hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Ir a página"
            >
              ...
            </button>
            <div v-else class="relative">
              <input
                ref="jumpInputLeftRef"
                v-model="jumpPageValue"
                type="number"
                :min="1"
                :max="totalPages"
                @keydown="handleJumpKeydown"
                @blur="handleJumpBlur"
                class="w-16 px-2 py-1 text-sm text-center border border-ufro rounded-lg focus:outline-none focus:ring-2 focus:ring-ufro"
                placeholder="#"
              />
            </div>
          </div>
          
          <!-- Ellipsis clickeable (derecho) -->
          <div v-else-if="item.type === 'ellipsis' && item.position === 'right'" class="relative">
            <button
              v-if="!showJumpInputRight"
              @click="openJumpInput('right')"
              class="px-2 py-2 text-gray-400 hover:text-ufro hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Ir a página"
            >
              ...
            </button>
            <div v-else class="relative">
              <input
                ref="jumpInputRightRef"
                v-model="jumpPageValue"
                type="number"
                :min="1"
                :max="totalPages"
                @keydown="handleJumpKeydown"
                @blur="handleJumpBlur"
                class="w-16 px-2 py-1 text-sm text-center border border-ufro rounded-lg focus:outline-none focus:ring-2 focus:ring-ufro"
                placeholder="#"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Botón Siguiente -->
      <button
        @click="goToPage(page + 1)"
        :disabled="page >= totalPages"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ufro focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
      >
        Siguiente
        <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

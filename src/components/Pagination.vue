<script setup>
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
defineProps({
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

function goToPage(newPage) {
  emit("change", newPage);
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
        <template v-for="pageNum in totalPages" :key="pageNum">
          <button
            v-if="pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)"
            @click="goToPage(pageNum)"
            :class="[
              'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              pageNum === page
                ? 'bg-ufro text-white'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            {{ pageNum }}
          </button>
          <span
            v-else-if="pageNum === page - 2 || pageNum === page + 2"
            class="px-2 py-2 text-gray-400"
          >
            ...
          </span>
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

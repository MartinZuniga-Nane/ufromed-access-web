<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
  navItems: {
    type: Array,
    required: true,
    // Cada item: { name: string, path: string, icon: string }
  },
  title: {
    type: String,
    default: "UFRO Admin",
  },
  subtitle: {
    type: String,
    default: "Panel de Control",
  },
  headerTitle: {
    type: String,
    default: "Dashboard Administrador",
  },
  welcomeTitle: {
    type: String,
    default: "",
  },
  welcomeSubtitle: {
    type: String,
    default: "Gestione los datos de alumnos y accesos del sistema institucional.",
  },
});

const emit = defineEmits(["logout"]);

const route = useRoute();
const isSidebarOpen = ref(false);

function isActive(path) {
  return route.path === path;
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
}

function closeSidebar() {
  isSidebarOpen.value = false;
}

function handleLogout() {
  emit("logout");
}

// Mapeo de iconos
const icons = {
  users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`,
  students: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />`,
  visits: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`,
};

function getIconPath(iconName) {
  return icons[iconName] || icons.users;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile sidebar backdrop -->
    <div
      v-if="isSidebarOpen"
      @click="closeSidebar"
      class="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div class="w-10 h-10 bg-ufro rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-800">{{ title }}</h1>
            <p class="text-xs text-gray-500">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            @click="closeSidebar"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors',
              isActive(item.path)
                ? 'bg-ufro-50 text-ufro border-l-4 border-ufro'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            <svg 
              class="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              v-html="getIconPath(item.icon)"
            ></svg>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>

        <!-- Logout -->
        <div class="p-4 border-t border-gray-200">
          <button
            @click="handleLogout"
            class="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="lg:pl-64">
      <!-- Top header -->
      <header class="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div class="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <!-- Mobile menu button -->
          <button
            @click="toggleSidebar"
            class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 class="text-lg font-semibold text-gray-800 lg:text-xl">
            {{ headerTitle }}
          </h2>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <!-- Welcome message -->
        <div v-if="welcomeTitle" class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
            {{ welcomeTitle }}
          </h1>
          <p class="mt-1 text-gray-500">
            {{ welcomeSubtitle }}
          </p>
        </div>

        <!-- Page slot -->
        <slot />
      </main>
    </div>
  </div>
</template>

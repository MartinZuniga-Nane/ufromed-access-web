<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Layout } from "@/shared/ui";
import { useAuthStore } from "@/stores/auth";
import { getNavItemsForRole } from "./config";

const authStore = useAuthStore();
const router = useRouter();

const userRole = computed(() => authStore.userRole || "ADMIN");
const userName = computed(() => authStore.userName || "Administrador");
const navItems = computed(() => getNavItemsForRole(userRole.value));

const welcomeTitle = computed(() => `Bienvenido, ${userName.value}`);

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};
</script>

<template>
  <Layout 
    :nav-items="navItems" 
    :welcome-title="welcomeTitle"
    @logout="handleLogout"
  >
    <router-view />
  </Layout>
</template>
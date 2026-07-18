<template>
  <v-app-bar color="primary" density="comfortable">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>پنل ادمین ربات</v-app-bar-title>
    <v-spacer />
    <v-btn icon="mdi-logout" @click="handleLogout" />
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" temporary>
    <v-list nav density="comfortable">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        @click="drawer = false"
      />
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <v-container fluid class="pa-3 pa-sm-6">
      <router-view />
    </v-container>
  </v-main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const drawer = ref(false);
const router = useRouter();
const auth = useAuthStore();

const navItems = [
  { to: "/categories", title: "حوزه‌های فعالیت", icon: "mdi-shape-outline" },
  { to: "/users", title: "کاربران", icon: "mdi-account-group-outline" },
  { to: "/settings", title: "تنظیمات ربات", icon: "mdi-cog-outline" },
];

function handleLogout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

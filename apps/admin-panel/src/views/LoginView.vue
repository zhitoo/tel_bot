<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-4" elevation="4">
          <v-card-title class="text-center">ورود به پنل ادمین</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="نام کاربری"
                variant="outlined"
                autocomplete="username"
                class="mb-2"
              />
              <v-text-field
                v-model="password"
                label="رمز عبور"
                type="password"
                variant="outlined"
                autocomplete="current-password"
                class="mb-2"
              />
              <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
              <v-btn type="submit" color="primary" block size="large" :loading="loading">ورود</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/api/auth/login", {
      username: username.value,
      password: password.value,
    });
    auth.setToken(data.token);
    router.push("/");
  } catch {
    error.value = "نام کاربری یا رمز عبور اشتباه است.";
  } finally {
    loading.value = false;
  }
}
</script>

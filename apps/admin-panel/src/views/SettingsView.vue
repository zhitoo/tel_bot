<template>
  <div>
    <h2 class="text-h6 mb-4">تنظیمات ربات</h2>

    <v-card class="mb-4">
      <v-card-item>
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div>
            <div class="text-subtitle-1">وضعیت ربات</div>
            <div class="text-caption text-medium-emphasis">
              وقتی غیرفعال باشد، کاربران با /start پیام "ربات غیرفعال است" دریافت می‌کنند.
            </div>
          </div>
          <v-switch
            v-model="isActive"
            color="primary"
            hide-details
            :label="isActive ? 'فعال' : 'غیرفعال'"
            @update:model-value="(val) => toggleActive(Boolean(val))"
          />
        </div>
      </v-card-item>
    </v-card>

    <v-card>
      <v-card-item>
        <div class="text-subtitle-1 mb-1">توکن ربات تلگرام (Bot Token)</div>
        <div class="text-caption text-medium-emphasis mb-3">
          توکن فعلی: <code>{{ botTokenMasked ?? "تنظیم نشده" }}</code>
        </div>
        <v-text-field
          v-model="newToken"
          label="توکن جدید از BotFather"
          variant="outlined"
          density="comfortable"
          placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
        <v-alert v-if="tokenError" type="error" density="compact" class="mb-3">{{ tokenError }}</v-alert>
        <v-alert v-if="tokenSuccess" type="success" density="compact" class="mb-3">{{ tokenSuccess }}</v-alert>
        <v-btn color="primary" :loading="savingToken" @click="saveToken">ذخیره و راه‌اندازی مجدد ربات</v-btn>
      </v-card-item>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api/client";

const isActive = ref(true);
const botTokenMasked = ref<string | null>(null);
const newToken = ref("");
const savingToken = ref(false);
const tokenError = ref("");
const tokenSuccess = ref("");

async function fetchSettings() {
  const { data } = await api.get("/api/settings");
  isActive.value = data.isActive;
  botTokenMasked.value = data.botTokenMasked;
}

async function toggleActive(value: boolean) {
  await api.patch("/api/settings", { isActive: value });
}

async function saveToken() {
  tokenError.value = "";
  tokenSuccess.value = "";
  if (!newToken.value.trim()) return;
  savingToken.value = true;
  try {
    const { data } = await api.patch("/api/settings/bot-token", { botToken: newToken.value.trim() });
    botTokenMasked.value = data.botTokenMasked;
    tokenSuccess.value = `توکن با موفقیت ثبت شد. ربات @${data.botUsername} راه‌اندازی مجدد شد.`;
    newToken.value = "";
  } catch (err: any) {
    tokenError.value = err?.response?.data?.error ?? "خطا در ذخیره توکن.";
  } finally {
    savingToken.value = false;
  }
}

onMounted(fetchSettings);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap mb-4 ga-2">
      <h2 class="text-h6">کاربران</h2>
      <v-btn color="primary" prepend-icon="mdi-file-excel-outline" :loading="exporting" @click="exportExcel">
        خروجی اکسل
      </v-btn>
    </div>

    <v-row class="mb-2" dense>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="search"
          label="جست‌وجو (نام، موبایل، یوزرنیم)"
          variant="outlined"
          density="comfortable"
          clearable
          @update:model-value="debouncedFetch"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="categoryId"
          :items="categoryOptions"
          item-title="title"
          item-value="id"
          label="فیلتر حوزه"
          variant="outlined"
          density="comfortable"
          clearable
          @update:model-value="fetchUsers"
        />
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="users"
      :loading="loading"
      :items-per-page="pageSize"
      item-value="id"
      mobile-breakpoint="sm"
    >
      <template #item.category="{ item }">{{ item.category?.title ?? "-" }}</template>
      <template #item.mobileSource="{ item }">
        <v-chip size="small" :color="item.mobileSource === 'telegram_contact' ? 'success' : 'default'">
          {{ item.mobileSource === "telegram_contact" ? "از تلگرام" : "دستی" }}
        </v-chip>
      </template>
      <template #item.createdAt="{ item }">{{ formatDate(item.createdAt) }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" color="error" @click="removeUser(item)">حذف</v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api/client";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  mobileSource: string;
  telegramUsername: string | null;
  createdAt: string;
  category: { id: string; title: string } | null;
}

const users = ref<UserRow[]>([]);
const loading = ref(false);
const exporting = ref(false);
const search = ref("");
const categoryId = ref<string | null>(null);
const pageSize = ref(20);
const categoryOptions = ref<{ id: string; title: string }[]>([]);

const headers = [
  { title: "نام", key: "firstName" },
  { title: "نام خانوادگی", key: "lastName" },
  { title: "موبایل", key: "mobile" },
  { title: "منبع شماره", key: "mobileSource" },
  { title: "حوزه", key: "category" },
  { title: "تاریخ ثبت", key: "createdAt" },
  { title: "", key: "actions", sortable: false },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchUsers, 350);
}

async function fetchUsers() {
  loading.value = true;
  try {
    const { data } = await api.get("/api/users", {
      params: { search: search.value || undefined, categoryId: categoryId.value || undefined, pageSize: 100 },
    });
    users.value = data.items;
  } finally {
    loading.value = false;
  }
}

async function fetchCategoryOptions() {
  const { data } = await api.get("/api/categories");
  categoryOptions.value = data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }));
}

async function removeUser(user: UserRow) {
  if (!confirm(`حذف کاربر ${user.firstName} ${user.lastName}؟`)) return;
  await api.delete(`/api/users/${user.id}`);
  await fetchUsers();
}

async function exportExcel() {
  exporting.value = true;
  try {
    const response = await api.get("/api/users/export", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fa-IR");
}

onMounted(() => {
  fetchUsers();
  fetchCategoryOptions();
});
</script>

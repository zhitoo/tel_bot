<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap mb-4 ga-2">
      <h2 class="text-h6">حوزه‌های فعالیت</h2>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">افزودن حوزه</v-btn>
    </div>

    <v-card v-for="cat in categories" :key="cat.id" class="mb-3">
      <v-card-item>
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div>
            <div class="text-subtitle-1">{{ cat.title }}</div>
            <div class="text-caption text-medium-emphasis">
              فایل: {{ cat.file?.originalName ?? "بدون فایل" }} · ترتیب: {{ cat.sortOrder }}
            </div>
          </div>
          <div class="d-flex align-center ga-2 flex-wrap">
            <v-switch
              v-model="cat.isActive"
              color="primary"
              density="compact"
              hide-details
              label="فعال"
              @update:model-value="(val) => toggleActive(cat, Boolean(val))"
            />
            <v-btn size="small" variant="tonal" @click="openFileDialog(cat)">آپلود فایل</v-btn>
            <v-btn size="small" variant="tonal" @click="openEditDialog(cat)">ویرایش</v-btn>
            <v-btn size="small" variant="tonal" color="error" @click="removeCategory(cat)">حذف</v-btn>
          </div>
        </div>
      </v-card-item>
    </v-card>

    <v-alert v-if="!loading && categories.length === 0" type="info" variant="tonal">
      هنوز هیچ حوزه‌ای ثبت نشده است.
    </v-alert>

    <!-- Create/Edit dialog -->
    <v-dialog v-model="dialog" max-width="480">
      <v-card>
        <v-card-title>{{ editingCategory ? "ویرایش حوزه" : "افزودن حوزه" }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="عنوان حوزه" variant="outlined" class="mb-2" />
          <v-text-field v-model.number="form.sortOrder" type="number" label="ترتیب نمایش" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">انصراف</v-btn>
          <v-btn color="primary" @click="saveCategory">ذخیره</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- File upload dialog -->
    <v-dialog v-model="fileDialog" max-width="480">
      <v-card>
        <v-card-title>آپلود فایل برای «{{ fileTargetCategory?.title }}»</v-card-title>
        <v-card-text>
          <v-file-input v-model="fileToUpload" label="انتخاب فایل" variant="outlined" show-size />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="fileDialog = false">انصراف</v-btn>
          <v-btn color="primary" :loading="uploading" @click="uploadFile">آپلود</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api/client";

interface Category {
  id: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
  file: { id: string; originalName: string } | null;
}

const categories = ref<Category[]>([]);
const loading = ref(false);

const dialog = ref(false);
const editingCategory = ref<Category | null>(null);
const form = ref({ title: "", sortOrder: 0 });

const fileDialog = ref(false);
const fileTargetCategory = ref<Category | null>(null);
// v-file-input without `multiple` emits a bare File (not File[]) on
// update:modelValue — see VFileInput's useProxiedModel transformOut, which
// unwraps to val[0] when !props.multiple.
const fileToUpload = ref<File | null>(null);
const uploading = ref(false);

async function fetchCategories() {
  loading.value = true;
  try {
    const { data } = await api.get("/api/categories");
    categories.value = data;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingCategory.value = null;
  form.value = { title: "", sortOrder: 0 };
  dialog.value = true;
}

function openEditDialog(cat: Category) {
  editingCategory.value = cat;
  form.value = { title: cat.title, sortOrder: cat.sortOrder };
  dialog.value = true;
}

async function saveCategory() {
  if (!form.value.title.trim()) return;
  if (editingCategory.value) {
    await api.patch(`/api/categories/${editingCategory.value.id}`, form.value);
  } else {
    await api.post("/api/categories", form.value);
  }
  dialog.value = false;
  await fetchCategories();
}

async function toggleActive(cat: Category, isActive: boolean) {
  await api.patch(`/api/categories/${cat.id}`, { isActive });
}

async function removeCategory(cat: Category) {
  if (!confirm(`حذف حوزه «${cat.title}»؟`)) return;
  await api.delete(`/api/categories/${cat.id}`);
  await fetchCategories();
}

function openFileDialog(cat: Category) {
  fileTargetCategory.value = cat;
  fileToUpload.value = null;
  fileDialog.value = true;
}

async function uploadFile() {
  if (!fileTargetCategory.value || !fileToUpload.value) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", fileToUpload.value);
    // Don't set Content-Type manually — axios/the browser must generate it
    // itself so it includes the multipart boundary, or @fastify/multipart
    // can't parse the body and req.file() comes back undefined (400).
    await api.post(`/api/categories/${fileTargetCategory.value.id}/file`, formData);
    fileDialog.value = false;
    await fetchCategories();
  } finally {
    uploading.value = false;
  }
}

onMounted(fetchCategories);
</script>

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/layouts/DashboardLayout.vue"),
      children: [
        { path: "", redirect: "/categories" },
        { path: "categories", name: "categories", component: () => import("@/views/CategoriesView.vue") },
        { path: "users", name: "users", component: () => import("@/views/UsersView.vue") },
        { path: "settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.token) {
    return { name: "login" };
  }
  if (to.name === "login" && auth.token) {
    return { path: "/" };
  }
  return true;
});

export default router;

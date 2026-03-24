<template>
  <div class="admin-layout">
    <LayoutAdminHeader />
    <div class="admin-layout__body">
      <LayoutAdminSidebar />
      <main class="admin-layout__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.admin-layout__body {
  display: flex;
  flex: 1;
}

.admin-layout__content {
  flex: 1;
  padding: 24px 32px;
}
</style>

<template>
  <ElContainer direction="vertical" style="min-height: 100vh">
    <LayoutAdminHeader />
    <ElContainer>
      <LayoutAdminSidebar />
      <ElMain style="background: var(--wk-admin-shell-bg); padding: 28px 36px">
        <div class="wk-admin-page">
          <slot />
        </div>
      </ElMain>
    </ElContainer>
  </ElContainer>
</template>

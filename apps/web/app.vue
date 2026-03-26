<template>
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Jost', sans-serif;
  color: #222;
  background: #fff;
  -webkit-font-smoothing: antialiased;
  font-weight: 400;
}

a {
  color: inherit;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

.page-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px;
}

.page-container-wide {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 8px;
}

.page-subtitle {
  color: #666;
  margin: 0 0 32px;
  font-size: 0.95rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #888;
}

.error-state {
  color: #b91c1c;
}
</style>

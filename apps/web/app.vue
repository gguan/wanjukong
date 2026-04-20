<script setup lang="ts">
const head = useLocaleHead({ seo: true })
useHead(head)
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <NuxtPage />
    </main>
    <AppFooter />
    <ClientOnly>
      <AppCookieBanner />
    </ClientOnly>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

/*
 * --site-gutter is the single source of truth for horizontal page padding.
 * Every top-level page wrapper, header, footer, and section uses it via
 * `padding-left: var(--site-gutter); padding-right: var(--site-gutter);`
 * so content edges line up across the storefront. Matches the PDP gutter.
 */
:root {
  --site-gutter: 24px;
}

@media (min-width: 1024px) {
  :root {
    --site-gutter: 160px;
  }
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px var(--site-gutter);
}

.page-container-wide {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px var(--site-gutter);
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

<script setup lang="ts">
const head = useLocaleHead({ seo: true })
useHead(head)

// Organization structured data for Google Knowledge Graph.
// Helps Safe Browsing classify the site as a legitimate retailer
// rather than an anonymous / impersonating .shop domain.
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || 'https://overrealm.shop'

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        name: 'OVER REALM',
        alternateName: 'OVER REALM Collectibles',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description:
          'Independent online store for premium 1/6, 1/4 and 1/12 scale collectible figures. Worldwide shipping, secure checkout.',
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@overrealm.shop',
            availableLanguage: ['English', 'Japanese', 'Chinese'],
          },
        ],
        sameAs: [] as string[],
      }),
    },
  ],
})
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
 * so content edges line up across the storefront.
 *
 * On ≥1024px viewports the gutter is max(160px, (100vw - 1400px)/2), so the
 * inner content column is capped at 1400px no matter how wide the viewport
 * gets — full-width wrappers with this padding line up with nested
 * max-width:1400 containers used by the PDP.
 */
:root {
  --site-gutter: 24px;
}

@media (min-width: 1024px) {
  :root {
    --site-gutter: max(160px, calc((100vw - 1400px) / 2));
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
  padding: 32px var(--site-gutter);
}

.page-container-wide {
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

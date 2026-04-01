/**
 * Fix Pinia SSR hydration crash: "obj.hasOwnProperty is not a function"
 *
 * During SSR, $fetch responses produce objects via devalue that lack
 * Object.prototype (created with Object.create(null)). When Pinia tries
 * to serialize/hydrate these, shouldHydrate() calls obj.hasOwnProperty()
 * which doesn't exist.
 *
 * This plugin patches PiniaPlugin to deep-clone state before hydration.
 */
export default defineNuxtPlugin((nuxtApp) => {
  // After Pinia hydration, ensure all state objects have proper prototypes
  nuxtApp.hook('app:created', () => {
    const pinia = nuxtApp.$pinia as any;
    if (!pinia?.state?.value) return;

    for (const storeId of Object.keys(pinia.state.value)) {
      const state = pinia.state.value[storeId];
      if (state && typeof state === 'object') {
        // Deep clone to ensure all nested objects have Object.prototype
        pinia.state.value[storeId] = JSON.parse(JSON.stringify(state));
      }
    }
  });
});

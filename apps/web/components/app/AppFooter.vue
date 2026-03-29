<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="footer-links">
        <NuxtLink to="/about">About</NuxtLink>
        <NuxtLink to="/contact">Contact</NuxtLink>
        <NuxtLink to="/shipping">Shipping</NuxtLink>
        <NuxtLink to="/returns">Returns</NuxtLink>
        <NuxtLink to="/faq">FAQ</NuxtLink>
        <NuxtLink to="/privacy">Privacy</NuxtLink>
      </div>
      <p class="footer-copy">© {{ new Date().getFullYear() }} wanjukong. All rights reserved.</p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 32px 20px;
}
.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  margin-bottom: 16px;
}
.footer-links a {
  font-size: 0.85rem;
  color: #666;
  text-decoration: none;
  transition: color 0.15s;
}
.footer-links a:hover { color: #111; }
.footer-copy {
  font-size: 0.8rem;
  color: #aaa;
  margin: 0;
}
</style>

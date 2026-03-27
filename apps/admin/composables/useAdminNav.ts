export function useAdminNav() {
  const store = useAdminAuthStore();

  const allItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Brands', to: '/brands' },
    { label: 'Categories', to: '/categories' },
    { label: 'Products', to: '/products' },
    { label: 'Admin Users', to: '/admin-users' },
  ];

  if (store.isBrandManager) {
    return allItems.filter((item) => item.to === '/products');
  }

  if (store.isAdminOrAbove) {
    return allItems;
  }

  // EDITOR: everything except Admin Users
  return allItems.filter((item) => item.to !== '/admin-users');
}

export function useAdminNav() {
  const store = useAdminAuthStore();

  const allItems = [
    { label: '总览', to: '/' },
    { label: '品牌', to: '/brands' },
    { label: '分类', to: '/categories' },
    { label: '商品', to: '/products' },
    { label: '管理员', to: '/admin-users' },
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

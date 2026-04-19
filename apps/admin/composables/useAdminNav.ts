export interface NavItem {
  label: string;
  to: string;
  group?: string;
}

export function useAdminNav(): NavItem[] {
  const store = useAdminAuthStore();

  const allItems: NavItem[] = [
    { label: '总览', to: '/', group: '主导航' },
    { label: '商品', to: '/products', group: '主导航' },
    { label: '订单', to: '/orders', group: '主导航' },
    { label: '品牌', to: '/brands', group: '目录' },
    { label: '分类', to: '/categories', group: '目录' },
    { label: '客户', to: '/customers', group: '设置' },
    { label: '管理员', to: '/admin-users', group: '设置' },
  ];

  // Super-admin-only links are stripped for everyone else.
  const superAdminOnly = new Set(['/customers']);

  if (store.isBrandManager) {
    return allItems.filter(
      (item) => item.to === '/' || item.to === '/products' || item.to === '/orders',
    );
  }

  if (store.isSuperAdmin) {
    return allItems;
  }

  if (store.isAdminOrAbove) {
    return allItems.filter((item) => !superAdminOnly.has(item.to));
  }

  // EDITOR: everything except Admin Users and super-admin-only links
  return allItems.filter(
    (item) => item.to !== '/admin-users' && !superAdminOnly.has(item.to),
  );
}

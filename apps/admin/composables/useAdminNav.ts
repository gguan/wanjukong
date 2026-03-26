export function useAdminNav() {
  return [
    { label: 'Dashboard', to: '/', icon: 'Odometer' },
    { label: 'Brands', to: '/brands', icon: 'CollectionTag' },
    { label: 'Categories', to: '/categories', icon: 'Folder' },
    { label: 'Products', to: '/products', icon: 'Goods' },
  ];
}

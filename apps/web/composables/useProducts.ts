export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  scale: string | null;
  status: string;
  availability: string;
  imageUrl: string | null;
  brandId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string; slug: string; logo: string | null };
  category: { id: string; name: string; slug: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export function useProducts() {
  const { get } = usePublicApi();

  function fetchProducts(filters?: Record<string, string>) {
    const params = new URLSearchParams();
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val) params.set(key, val);
      }
    }
    const qs = params.toString();
    return get<Product[]>(`/public/products${qs ? `?${qs}` : ''}`);
  }

  function fetchProductBySlug(slug: string) {
    return get<Product>(`/public/products/${slug}`);
  }

  function fetchCategories() {
    return get<Category[]>('/public/categories');
  }

  return { fetchProducts, fetchProductBySlug, fetchCategories };
}

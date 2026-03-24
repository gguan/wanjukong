export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandWithProducts extends Brand {
  products: Product[];
}

export function useBrands() {
  const { get } = usePublicApi();

  function fetchBrands() {
    return get<Brand[]>('/public/brands');
  }

  function fetchBrandBySlug(slug: string) {
    return get<BrandWithProducts>(`/public/brands/${slug}`);
  }

  return { fetchBrands, fetchBrandBySlug };
}

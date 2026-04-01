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
  const { lang } = useLang();

  function fetchBrands() {
    return get<Brand[]>(`/public/brands?lang=${lang.value}`);
  }

  function fetchBrandBySlug(slug: string) {
    return get<BrandWithProducts>(`/public/brands/${slug}?lang=${lang.value}`);
  }

  return { fetchBrands, fetchBrandBySlug };
}

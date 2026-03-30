import { fetchProducts, fetchCategories } from '../../utils/api';
import type { Product, Category } from '../../utils/api';

Page({
  data: {
    products: [] as Product[],
    categories: [] as Category[],
    activeCategory: '',
    searchValue: '',
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    limit: 10,
  },

  onLoad(query: Record<string, string | undefined>) {
    if (query.brand) {
      this.setData({ activeCategory: '' });
    }
    this.loadCategories();
    this.loadProducts(true);
  },

  onPullDownRefresh() {
    this.loadProducts(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  async loadCategories() {
    try {
      const categories = await fetchCategories();
      this.setData({ categories });
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  },

  async loadProducts(reset = false) {
    if (reset) {
      this.setData({ page: 1, hasMore: true, loading: true });
    }

    const params: Record<string, string> = {
      page: String(this.data.page),
      limit: String(this.data.limit),
    };

    if (this.data.searchValue) {
      params.search = this.data.searchValue;
    }
    if (this.data.activeCategory) {
      params.category = this.data.activeCategory;
    }

    try {
      const result = await fetchProducts(params);
      const products = reset ? result.data : [...this.data.products, ...result.data];
      const hasMore = products.length < result.total;
      this.setData({ products, hasMore, loading: false, loadingMore: false });
    } catch (err) {
      console.error('Failed to load products:', err);
      this.setData({ loading: false, loadingMore: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    await this.loadProducts(false);
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchValue: e.detail.value });
  },

  onSearchConfirm() {
    this.loadProducts(true);
  },

  onClearSearch() {
    this.setData({ searchValue: '' });
    this.loadProducts(true);
  },

  onTapCategory(e: WechatMiniprogram.TouchEvent) {
    const slug = e.currentTarget.dataset.slug as string;
    const activeCategory = this.data.activeCategory === slug ? '' : slug;
    this.setData({ activeCategory });
    this.loadProducts(true);
  },

  onTapProduct(e: WechatMiniprogram.TouchEvent) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/product-detail/index?slug=${slug}` });
  },
});

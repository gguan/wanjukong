import { fetchProducts } from '../../utils/api';
import type { Product } from '../../utils/api';

Page({
  data: {
    products: [] as Product[],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() {
    this.loadProducts(true);
  },

  onPullDownRefresh() {
    this.loadProducts(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadProducts(false);
    }
  },

  async loadProducts(reset: boolean) {
    if (reset) {
      this.setData({ page: 1, hasMore: true, loading: true });
    } else {
      this.setData({ loadingMore: true });
    }

    const page = reset ? 1 : this.data.page;

    try {
      const result = await fetchProducts({ page: String(page), limit: '10' });
      const newProducts = result.data || [];
      const hasMore = newProducts.length >= 10;

      this.setData({
        products: reset ? newProducts : [...this.data.products, ...newProducts],
        page: page + 1,
        hasMore,
        loading: false,
        loadingMore: false,
      });
    } catch (err) {
      console.error('Failed to load products:', err);
      this.setData({ loading: false, loadingMore: false });
    }
  },

  onTapProduct(e: WechatMiniprogram.TouchEvent) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/product-detail/index?slug=${slug}` });
  },
});

import { fetchProducts, fetchBrands } from '../../utils/api';
import type { Product, Brand } from '../../utils/api';

Page({
  data: {
    featured: [] as Product[],
    brands: [] as Brand[],
    loading: true,
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [products, brands] = await Promise.all([
        fetchProducts({ limit: '8' }),
        fetchBrands(),
      ]);
      this.setData({
        featured: products.data,
        brands,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load homepage:', err);
      this.setData({ loading: false });
    }
  },

  onTapProduct(e: WechatMiniprogram.TouchEvent) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/product-detail/index?slug=${slug}` });
  },

  onTapBrand(e: WechatMiniprogram.TouchEvent) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/product-list/index?brand=${slug}` });
  },

  onTapViewAll() {
    wx.switchTab({ url: '/pages/product-list/index' });
  },
});

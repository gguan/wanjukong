import { fetchProductBySlug } from '../../utils/api';
import { formatCNY, formatUSD } from '../../utils/format';
import { getCart, setCart } from '../../utils/storage';
import type { Product, ProductVariant } from '../../utils/api';
import type { CartItem } from '../../utils/storage';

Page({
  data: {
    product: null as Product | null,
    currentVariant: null as ProductVariant | null,
    selectedVariantId: '',
    heroImage: '',
    galleryImages: [] as string[],
    displayPriceCNY: '',
    displayPriceUSD: '',
    isSoldOut: false,
    loading: true,
    statusBarHeight: 44,
  },

  onLoad(query: Record<string, string | undefined>) {
    const sysInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 });

    const slug = query.slug;
    if (!slug) {
      wx.showToast({ title: '商品不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadProduct(slug);
  },

  onShareAppMessage() {
    const p = this.data.product;
    return {
      title: p ? p.name : '万局控',
      path: `/pages/product-detail/index?slug=${p?.slug}`,
      imageUrl: p?.imageUrl || undefined,
    };
  },

  async loadProduct(slug: string) {
    this.setData({ loading: true });
    try {
      const product = await fetchProductBySlug(slug);

      // Build image lists
      const allImages: string[] = [];
      if (product.images?.length) {
        product.images.forEach((img) => allImages.push(img.imageUrl));
      } else if (product.imageUrl) {
        allImages.push(product.imageUrl);
      }

      const heroImage = allImages[0] || '';
      const galleryImages = allImages; // all images including hero shown in gallery

      const defaultVariant =
        product.variants?.find((v) => v.isDefault) || product.variants?.[0] || null;

      this.setData({
        product,
        heroImage,
        galleryImages,
        loading: false,
      });

      if (defaultVariant) {
        this.selectVariant(defaultVariant);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  selectVariant(variant: ProductVariant) {
    this.setData({
      currentVariant: variant,
      selectedVariantId: variant.id,
      displayPriceCNY: formatCNY(variant.priceCents),
      displayPriceUSD: variant.usdPriceCents ? formatUSD(variant.usdPriceCents) : '',
      isSoldOut: variant.isSoldOut,
    });
  },

  onTapVariant(e: WechatMiniprogram.TouchEvent) {
    const variantId = e.currentTarget.dataset.id as string;
    const variant = this.data.product?.variants?.find((v) => v.id === variantId);
    if (variant) this.selectVariant(variant);
  },

  onTapBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  onTapCart() {
    wx.switchTab({ url: '/pages/cart/index' });
  },

  onAddToCart() {
    const { product, currentVariant } = this.data;
    if (!product || !currentVariant || currentVariant.isSoldOut) return;

    const cart = getCart();
    const existingIdx = cart.findIndex(
      (item) => item.productId === product.id && item.variantId === currentVariant.id,
    );

    if (existingIdx >= 0) {
      cart[existingIdx].quantity += 1;
    } else {
      const item: CartItem = {
        productId: product.id,
        variantId: currentVariant.id,
        productName: product.name,
        variantName: currentVariant.name,
        imageUrl: currentVariant.coverImageUrl || product.imageUrl || '',
        priceCents: currentVariant.priceCents,
        quantity: 1,
      };
      cart.push(item);
    }

    setCart(cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  onBuyNow() {
    const { product, currentVariant } = this.data;
    if (!product || !currentVariant || currentVariant.isSoldOut) return;

    const buyNowItem: CartItem = {
      productId: product.id,
      variantId: currentVariant.id,
      productName: product.name,
      variantName: currentVariant.name,
      imageUrl: currentVariant.coverImageUrl || product.imageUrl || '',
      priceCents: currentVariant.priceCents,
      quantity: 1,
    };

    wx.setStorageSync('wk_buy_now', JSON.stringify(buyNowItem));
    wx.navigateTo({ url: '/pages/checkout/index?mode=buyNow' });
  },
});

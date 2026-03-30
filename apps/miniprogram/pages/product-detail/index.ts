import { fetchProductBySlug } from '../../utils/api';
import { formatCNY, formatUSD, formatPrice } from '../../utils/format';
import { getCart, setCart } from '../../utils/storage';
import type { Product, ProductVariant } from '../../utils/api';
import type { CartItem } from '../../utils/storage';

Page({
  data: {
    product: null as Product | null,
    currentVariant: null as ProductVariant | null,
    selectedVariantId: '',
    swiperImages: [] as string[],
    displayPriceCNY: '',
    displayPriceUSD: '',
    availabilityText: '',
    availabilityClass: '',
    isSoldOut: false,
    loading: true,
  },

  onLoad(query: Record<string, string | undefined>) {
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
      const images: string[] = [];
      if (product.images?.length) {
        product.images.forEach((img) => images.push(img.imageUrl));
      } else if (product.imageUrl) {
        images.push(product.imageUrl);
      }

      const defaultVariant =
        product.variants?.find((v) => v.isDefault) || product.variants?.[0] || null;

      this.setData({
        product,
        swiperImages: images,
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
    const availabilityMap: Record<string, { text: string; cls: string }> = {
      IN_STOCK: { text: '现货', cls: 'badge-success' },
      PREORDER: { text: '预售', cls: 'badge-warning' },
      SOLD_OUT: { text: '售罄', cls: 'badge-danger' },
    };

    const availability = this.data.product?.displayAvailability || '';
    const isSoldOut = variant.isSoldOut;
    const info = isSoldOut
      ? { text: '售罄', cls: 'badge-danger' }
      : availabilityMap[availability] || { text: '', cls: '' };

    this.setData({
      currentVariant: variant,
      selectedVariantId: variant.id,
      displayPriceCNY: formatCNY(variant.priceCents),
      displayPriceUSD: variant.usdPriceCents ? formatUSD(variant.usdPriceCents) : '',
      availabilityText: info.text,
      availabilityClass: info.cls,
      isSoldOut,
    });
  },

  onTapVariant(e: WechatMiniprogram.TouchEvent) {
    const variantId = e.currentTarget.dataset.id as string;
    const variant = this.data.product?.variants?.find((v) => v.id === variantId);
    if (variant) {
      this.selectVariant(variant);
    }
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

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
    cartCount: 0,
    // Preorder state: 'none' | 'upcoming' | 'active'
    preorderState: 'none' as 'none' | 'upcoming' | 'active',
    preorderStartDisplay: '',
    depositDisplay: '',
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

  onShow() {
    this.updateCartCount();
  },

  onShareAppMessage() {
    const p = this.data.product;
    return {
      title: p ? p.name : '万局控',
      path: `/pages/product-detail/index?slug=${p?.slug}`,
      imageUrl: p?.imageUrl || undefined,
    };
  },

  updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartCount: count });
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

      // Compute preorder state
      const preorderInfo = this.computePreorderState(product);

      this.setData({
        product,
        heroImage,
        galleryImages,
        loading: false,
        ...preorderInfo,
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

  computePreorderState(product: Product) {
    if (product.saleType !== 'PREORDER') {
      return { preorderState: 'none' as const, preorderStartDisplay: '', depositDisplay: '' };
    }

    const now = Date.now();
    const startAt = product.preorderStartAt ? new Date(product.preorderStartAt).getTime() : null;
    const endAt = product.preorderEndAt ? new Date(product.preorderEndAt).getTime() : null;

    // If preorder window hasn't started yet
    if (startAt && now < startAt) {
      const d = new Date(product.preorderStartAt!);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const display = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return {
        preorderState: 'upcoming' as const,
        preorderStartDisplay: display,
        depositDisplay: '',
      };
    }

    // If within preorder window (or no dates set, treat as active preorder)
    if (!endAt || now <= endAt) {
      const depositDisplay = product.depositCents ? formatCNY(product.depositCents) : '';
      return {
        preorderState: 'active' as const,
        preorderStartDisplay: '',
        depositDisplay,
      };
    }

    // Preorder window has passed
    return { preorderState: 'none' as const, preorderStartDisplay: '', depositDisplay: '' };
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

    const isPreorder = product.saleType === 'PREORDER';
    const perUnitDeposit = isPreorder
      ? (product.depositCents && product.depositCents > 0
          ? product.depositCents
          : Math.round(currentVariant.priceCents * 0.1))
      : currentVariant.priceCents;

    if (existingIdx >= 0) {
      cart[existingIdx].quantity += 1;
      // 回填旧数据缺失的字段
      if (cart[existingIdx].preorderStartAt === undefined) {
        cart[existingIdx].preorderStartAt = product.preorderStartAt || null;
      }
      cart[existingIdx].isPreorder = isPreorder;
      cart[existingIdx].depositCents = perUnitDeposit;
    } else {
      const item: CartItem = {
        productId: product.id,
        variantId: currentVariant.id,
        productName: product.name,
        variantName: currentVariant.name,
        imageUrl: currentVariant.coverImageUrl || product.imageUrl || '',
        priceCents: currentVariant.priceCents,
        quantity: 1,
        preorderStartAt: product.preorderStartAt || null,
        isPreorder,
        depositCents: perUnitDeposit,
      };
      cart.push(item);
    }

    setCart(cart);
    this.updateCartCount();
    wx.showToast({ title: '已加入购物袋', icon: 'success' });
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

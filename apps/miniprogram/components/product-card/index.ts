import { formatPrice } from '../../utils/format';

Component({
  properties: {
    product: { type: Object, value: {} },
  },

  data: {
    displayPrice: '',
    hasMultipleVariants: false,
  },

  observers: {
    product(val: Record<string, unknown>) {
      if (!val || !val.variants) return;
      const variants = val.variants as Array<{
        isDefault: boolean;
        priceCents: number;
        usdPriceCents: number | null;
      }>;
      const def = variants.find((v) => v.isDefault) || variants[0];
      if (def) {
        this.setData({
          displayPrice: formatPrice(def.priceCents, def.usdPriceCents),
          hasMultipleVariants: variants.length > 1,
        });
      }
    },
  },
});

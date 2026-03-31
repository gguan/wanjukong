Component({
  properties: {
    product: { type: Object, value: {} },
  },

  data: {
    priceDisplay: '0',
  },

  observers: {
    product(val: Record<string, unknown>) {
      if (!val || !val.variants) return;
      const variants = val.variants as Array<{
        isDefault: boolean;
        priceCents: number;
      }>;
      const def = variants.find((v) => v.isDefault) || variants[0];
      if (def) {
        // Show integer if no decimals, otherwise 2 decimal places
        const yuan = def.priceCents / 100;
        const display = yuan === Math.floor(yuan)
          ? String(Math.floor(yuan))
          : yuan.toFixed(2);
        this.setData({ priceDisplay: display });
      }
    },
  },
});

import { fetchAddresses, deleteAddress } from '../../utils/api';
import { requireAuth } from '../../utils/auth';
import type { Address } from '../../utils/api';

interface AddressDisplay extends Address {
  displayAddress: string;
}

function formatAddress(addr: Address): string {
  const parts = [
    addr.stateOrProvince,
    addr.city,
    addr.district,
    addr.addressLine1,
  ].filter(Boolean);
  return parts.join(' ');
}

Page({
  data: {
    statusBarHeight: 44,
    addresses: [] as AddressDisplay[],
    loading: true,
    fromCheckout: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    if (!requireAuth()) return;
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({
      statusBarHeight: statusBarHeight || 44,
      fromCheckout: query.from === 'checkout',
    });
    this.loadAddresses();
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    this.setData({ loading: true });
    try {
      const raw = await fetchAddresses();
      const addresses: AddressDisplay[] = raw.map((addr) => ({
        ...addr,
        displayAddress: formatAddress(addr),
      }));
      this.setData({ addresses, loading: false });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onGoBack() {
    wx.navigateBack();
  },

  onSelectAddress(e: WechatMiniprogram.TouchEvent) {
    if (!this.data.fromCheckout) return;
    const id = e.currentTarget.dataset.id as string;
    const addr = this.data.addresses.find((a) => a.id === id);
    if (!addr) return;
    wx.setStorageSync('wk_selected_address', JSON.stringify(addr));
    wx.navigateBack();
  },

  onEditAddress(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/address-edit/index?id=${id}` });
  },

  onAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/index' });
  },

  onDeleteAddress(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.showModal({
      title: '删除地址',
      content: '确定要删除该收货地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteAddress(id);
            this.loadAddresses();
          } catch {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  },
});

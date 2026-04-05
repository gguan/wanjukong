import { fetchAddresses, createAddress, updateAddress } from '../../utils/api';
import { ensureAuth } from '../../utils/auth';
import type { Address } from '../../utils/api';

interface FormData {
  fullName: string;
  phone: string;
  stateOrProvince: string;
  city: string;
  district: string;
  addressLine1: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormData = {
  fullName: '',
  phone: '',
  stateOrProvince: '',
  city: '',
  district: '',
  addressLine1: '',
  isDefault: false,
};

Page({
  data: {
    editId: '' as string,
    form: { ...EMPTY_FORM } as FormData,
    regionValue: ['', '', ''] as string[],
    saving: false,
  },

  async onLoad(query: Record<string, string | undefined>) {
    if (!(await ensureAuth())) return;

    const editId = query.id || '';
    this.setData({ editId });

    if (editId) {
      wx.setNavigationBarTitle({ title: '编辑收货地址' });
      this.loadAddress(editId);
    }
  },

  async loadAddress(id: string) {
    try {
      const list = await fetchAddresses();
      const addr = list.find((a: Address) => a.id === id);
      if (!addr) return;
      this.setData({
        form: {
          fullName: addr.fullName,
          phone: addr.phone || '',
          stateOrProvince: addr.stateOrProvince || '',
          city: addr.city,
          district: addr.district || '',
          addressLine1: addr.addressLine1,
          isDefault: addr.isDefault,
        },
        regionValue: [
          addr.stateOrProvince || '',
          addr.city,
          addr.district || '',
        ],
      });
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e: WechatMiniprogram.Input) {
    const field = e.currentTarget.dataset.field as keyof FormData;
    const form = { ...this.data.form, [field]: e.detail.value };
    this.setData({ form });
  },

  onRegionChange(e: WechatMiniprogram.PickerChange) {
    const value = e.detail.value as string[];
    const form = {
      ...this.data.form,
      stateOrProvince: value[0] || '',
      city: value[1] || '',
      district: value[2] || '',
    };
    this.setData({ form, regionValue: value });
  },

  onToggleDefault() {
    const form = { ...this.data.form, isDefault: !this.data.form.isDefault };
    this.setData({ form });
  },

  onWechatImport() {
    wx.chooseAddress({
      success: (res) => {
        const form: FormData = {
          fullName: res.userName,
          phone: res.telNumber,
          stateOrProvince: res.provinceName,
          city: res.cityName,
          district: res.countyName,
          addressLine1: res.detailInfo,
          isDefault: this.data.form.isDefault,
        };
        this.setData({
          form,
          regionValue: [res.provinceName, res.cityName, res.countyName],
        });
      },
      fail: (err) => {
        if (!err.errMsg.includes('cancel')) {
          wx.showToast({ title: '获取地址失败', icon: 'none' });
        }
      },
    });
  },

  async onSave() {
    if (this.data.saving) return;

    const { form, editId } = this.data;

    if (!form.fullName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!form.phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!form.stateOrProvince || !form.city) {
      wx.showToast({ title: '请选择省市区', icon: 'none' });
      return;
    }
    if (!form.addressLine1.trim()) {
      wx.showToast({ title: '请输入详情地址', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        country: 'CN',
        stateOrProvince: form.stateOrProvince,
        city: form.city,
        district: form.district,
        addressLine1: form.addressLine1.trim(),
        isDefault: form.isDefault,
      };

      if (editId) {
        await updateAddress(editId, payload);
      } else {
        await createAddress(payload);
      }

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.showToast({
        title: (err as Error).message || '保存失败',
        icon: 'none',
      });
    } finally {
      this.setData({ saving: false });
    }
  },
});

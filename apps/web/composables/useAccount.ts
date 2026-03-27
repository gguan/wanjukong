export interface CustomerAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string | null;
  country: string;
  stateOrProvince: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export function useAccount() {
  const { get, post, put, del } = usePublicApi();

  async function getProfile() {
    return get<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      emailVerifiedAt: string | null;
      createdAt: string;
    }>('/public/account/profile');
  }

  async function updateProfile(data: { name?: string; phone?: string }) {
    return put<void>('/public/account/profile', data);
  }

  async function listAddresses() {
    return get<CustomerAddress[]>('/public/account/addresses');
  }

  async function createAddress(data: Record<string, any>) {
    return post<CustomerAddress>('/public/account/addresses', data);
  }

  async function updateAddress(id: string, data: Record<string, any>) {
    return put<CustomerAddress>(`/public/account/addresses/${id}`, data);
  }

  async function deleteAddress(id: string) {
    return del(`/public/account/addresses/${id}`);
  }

  async function setDefaultAddress(id: string) {
    return post(`/public/account/addresses/${id}/set-default`, {});
  }

  async function listOrders() {
    return get<any[]>('/public/account/orders');
  }

  async function getOrder(orderNo: string) {
    return get<any>(`/public/account/orders/${orderNo}`);
  }

  return {
    getProfile,
    updateProfile,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    listOrders,
    getOrder,
  };
}

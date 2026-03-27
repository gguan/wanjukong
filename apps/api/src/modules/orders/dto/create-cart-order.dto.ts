export class CartItemDto {
  productId!: string;
  variantId!: string;
  quantity!: number;
}

export class CreateCartOrderDto {
  items!: CartItemDto[];

  // Contact
  fullName!: string;
  email!: string;
  phone?: string;

  // Shipping
  country!: string;
  stateOrProvince?: string;
  city!: string;
  addressLine1!: string;
  addressLine2?: string;
  postalCode?: string;

  currency?: string;
  paypalOrderId?: string;
  customerId?: string;
  guestAccessTokenHash?: string;
}

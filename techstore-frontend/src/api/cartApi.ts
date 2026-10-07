import api from './axiosConfig';
import { Cart } from '../types';

export const cartApi = {
  get: async (): Promise<Cart> => {
    const response = await api.get<Cart>('/cart');
    return response.data;
  },

  addItem: async (productId: string, quantity: number = 1): Promise<Cart> => {
    const response = await api.post<Cart>('/cart/items', { productId, quantity });
    return response.data;
  },

  updateItem: async (itemId: string, quantity: number): Promise<Cart> => {
    const response = await api.put<Cart>(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId: string): Promise<Cart> => {
    const response = await api.delete<Cart>(`/cart/items/${itemId}`);
    return response.data;
  },

  applyCoupon: async (couponCode: string): Promise<Cart> => {
    const response = await api.post<Cart>('/cart/apply-coupon', { couponCode });
    return response.data;
  },

  removeCoupon: async (): Promise<Cart> => {
    const response = await api.delete<Cart>('/cart/remove-coupon');
    return response.data;
  },
};

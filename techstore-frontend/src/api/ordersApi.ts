import api from './axiosConfig';
import { CreateOrderInput, Order, OrderStats } from '../types';

export const ordersApi = {
  // Dirección guardada (addressId) o nueva; el backend guarda una copia para el pedido.
  create: async (data: CreateOrderInput): Promise<Order> => {
    const response = await api.post<Order>('/orders', data);
    return response.data;
  },

  getMyOrders: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>('/orders');
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },

  getAllAdmin: async (status?: string): Promise<Order[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<Order[]>(`/orders/admin/all${params}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${id}/status`, { status });
    return response.data;
  },

  // El cliente cancela su propio pedido (HU-17).
  cancel: async (id: string): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${id}/cancel`);
    return response.data;
  },

  getStats: async (): Promise<OrderStats> => {
    const response = await api.get<OrderStats>('/orders/admin/stats');
    return response.data;
  },
};

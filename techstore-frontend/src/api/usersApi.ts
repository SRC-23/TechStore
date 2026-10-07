import api from './axiosConfig';
import { Profile, SaveAddressInput, SavedAddress } from '../types';

export const usersApi = {
  getProfile: async (): Promise<Profile> => {
    const response = await api.get<Profile>('/users/me');
    return response.data;
  },

  updateProfile: async (data: { firstName: string; lastName: string; phone?: string }): Promise<Profile> => {
    const response = await api.put<Profile>('/users/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/users/me/password', { currentPassword, newPassword });
  },

  getAddresses: async (): Promise<SavedAddress[]> => {
    const response = await api.get<SavedAddress[]>('/users/me/addresses');
    return response.data;
  },

  addAddress: async (data: SaveAddressInput): Promise<SavedAddress> => {
    const response = await api.post<SavedAddress>('/users/me/addresses', data);
    return response.data;
  },

  updateAddress: async (id: string, data: SaveAddressInput): Promise<SavedAddress> => {
    const response = await api.put<SavedAddress>(`/users/me/addresses/${id}`, data);
    return response.data;
  },

  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`/users/me/addresses/${id}`);
  },
};

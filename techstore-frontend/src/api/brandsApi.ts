import api from './axiosConfig';
import { Brand } from '../types';

export const brandsApi = {
  getAll: async (): Promise<Brand[]> => {
    const response = await api.get<Brand[]>('/brands');
    return response.data;
  },
};

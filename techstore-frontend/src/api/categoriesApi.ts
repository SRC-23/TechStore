import api from './axiosConfig';
import { Category } from '../types';

export interface CategoryInput {
  name: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

export const categoriesApi = {
  getAll: async (includeInactive = false): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories', { params: includeInactive ? { includeInactive } : undefined });
    return response.data;
  },

  create: async (data: CategoryInput): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: string, data: CategoryInput): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

/** Lista plana (categorías y subcategorías) para selects y filtros. */
export function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap(c => [c, ...c.subCategories]);
}

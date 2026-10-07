import api from './axiosConfig';
import { DiscountRule, DiscountRuleInput } from '../types';

export const pricingRulesApi = {
  getAll: async (): Promise<DiscountRule[]> => {
    const response = await api.get<DiscountRule[]>('/pricing-rules');
    return response.data;
  },

  create: async (data: DiscountRuleInput): Promise<DiscountRule> => {
    const response = await api.post<DiscountRule>('/pricing-rules', data);
    return response.data;
  },

  update: async (id: string, data: DiscountRuleInput): Promise<DiscountRule> => {
    const response = await api.put<DiscountRule>(`/pricing-rules/${id}`, data);
    return response.data;
  },

  toggle: async (id: string): Promise<void> => {
    await api.put(`/pricing-rules/${id}/toggle`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/pricing-rules/${id}`);
  },
};

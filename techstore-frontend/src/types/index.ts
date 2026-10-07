// User types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'Client' | 'Admin';
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  label?: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface SaveAddressInput {
  label?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  specifications?: string | null;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  imageUrls?: string | null;
  isActive: boolean;
  discountedPrice?: number | null;
  discountPercentage?: number | null;
  isOnSale: boolean;
  offerEndsAt?: string | null;
  offerName?: string | null;
}

export interface ProductsResponse {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortOption = 'name' | 'price_asc' | 'price_desc' | 'newest';

export interface ProductQuery {
  page: number;
  pageSize: number;
  search?: string;
  categoryIds?: string[];
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: SortOption;
  includeInactive?: boolean;
}

// Category types
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  productCount: number;
  subCategories: Category[];
}

// Brand types
export interface Brand {
  id: string;
  name: string;
}

// Cart types
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  categoryName: string;
  brandName: string;
  stock: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  couponCode?: string | null;
  subtotal: number;
  totalDiscount: number;
  total: number;
  appliedDiscounts: AppliedDiscountInfo[];
}

export interface AppliedDiscountInfo {
  ruleName?: string;
  description: string;
  discountAmount: number;
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  totalDiscount: number;
  total: number;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
  shippingAddress?: ShippingAddress | null;
  items: OrderItem[];
  appliedDiscounts: AppliedDiscountInfo[];
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/** Cuerpo de POST /orders: una dirección guardada o una nueva. */
export interface CreateOrderInput {
  addressId?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  saveAddress?: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

// Estadísticas del panel admin (HU-22)
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalDiscountsGiven: number;
  averageOrderValue: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  lowStockThreshold: number;
  topProducts: TopProduct[];
  salesLast7Days: DailySales[];
  lowStockItems: LowStockItem[];
}

export interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface DailySales {
  date: string;
  total: number;
  orders: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  stock: number;
}

// Discount Rule types
export interface DiscountRule {
  id: string;
  name: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  isPercentage: boolean;
  couponCode?: string | null;
  priority: number;
  isStackable: boolean;
  startDate: string;
  endDate: string;
  minimumAmount?: number | null;
  minimumQuantity?: number | null;
  isActive: boolean;
  timesUsed: number;
  maxUses?: number | null;
  productIds: string[];
  categoryIds: string[];
}

export interface DiscountRuleInput {
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  isPercentage: boolean;
  couponCode?: string;
  priority: number;
  isStackable: boolean;
  startDate: string;
  endDate: string;
  minimumAmount?: number;
  minimumQuantity?: number;
  maxUses?: number;
  productIds: string[];
  categoryIds: string[];
}

export type DiscountType = 'Percentage' | 'FixedAmount' | 'Coupon' | 'Volume' | 'TimeLimited' | 'Category' | 'Bundle';

// API common types
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

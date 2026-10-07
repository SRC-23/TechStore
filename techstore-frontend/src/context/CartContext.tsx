import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Cart } from '../types';
import { cartApi } from '../api/cartApi';

interface CartContextType {
  cart: Cart | null;
  setCart: (cart: Cart | null) => void;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await cartApi.get());
    } catch {
      setCart(null);
    }
  }, []);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, setCart, refreshCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

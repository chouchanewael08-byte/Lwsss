import { create } from 'zustand';
import { Product } from '../types';
import { api } from '../lib/api';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  addProduct: (product: any) => Promise<void>;
  updateProductPriceAndDiscount: (productId: string, price: number, discount: number) => Promise<void>;
  toggleProductVisibility: (productId: string) => Promise<void>;
  reportProduct: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  setProductsInCache: (prods: Product[]) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const resp = await api.getProducts(1, 100); // load products cache
      set({ products: resp.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل المنتجات', loading: false });
    }
  },

  addProduct: async (newProdData) => {
    set({ loading: true, error: null });
    try {
      const created = await api.createProduct(newProdData);
      set(state => ({
        products: [created, ...state.products],
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'فشل إدراج السلعة', loading: false });
    }
  },

  updateProductPriceAndDiscount: async (productId, price, discount) => {
    try {
      const updated = await api.updateProduct(productId, { price, discountPercentage: discount });
      set(state => ({
        products: state.products.map(p => p.id === productId ? updated : p)
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  toggleProductVisibility: async (productId) => {
    const { products } = get();
    const found = products.find(p => p.id === productId);
    if (!found) return;
    try {
      const updated = await api.updateProduct(productId, { isHidden: !found.isHidden });
      set(state => ({
        products: state.products.map(p => p.id === productId ? updated : p)
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  reportProduct: async (productId) => {
    // Report triggers local plus backend update
    try {
      const { products } = get();
      const found = products.find(p => p.id === productId);
      if (found) {
        const updated = await api.updateProduct(productId, { reportsCount: (found.reportsCount || 0) + 1 });
        set(state => ({
          products: state.products.map(p => p.id === productId ? updated : p)
        }));
      }
    } catch (errNoBody) {
      // fallback local increment in case of permission delay
      set(state => ({
        products: state.products.map(p => p.id === productId ? { ...p, reportsCount: (p.reportsCount || 0) + 1 } : p)
      }));
    }
  },

  deleteProduct: async (productId) => {
    try {
      await api.deleteProduct(productId);
      set(state => ({
        products: state.products.filter(p => p.id !== productId)
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  setProductsInCache: (prods: Product[]) => {
    set({ products: prods });
  }
}));

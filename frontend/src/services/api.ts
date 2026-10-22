import {
  Product,
  AISearchResponse,
  CartSummary,
  Order,
  User,
  AdminStats,
  AdminAnalytics,
  CSVImportResult
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Generates or retrieves unique session id for guest cart tracking
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('shopai_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('shopai_session_id', sessionId);
  }
  return sessionId;
};

export const api = {
  // Products
  async getProducts(params?: {
    category?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    search?: string;
    sort?: string;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params) {
      if (params.category && params.category !== 'All') query.append('category', params.category);
      if (params.brand) query.append('brand', params.brand);
      if (params.min_price !== undefined) query.append('min_price', params.min_price.toString());
      if (params.max_price !== undefined) query.append('max_price', params.max_price.toString());
      if (params.in_stock_only) query.append('in_stock_only', 'true');
      if (params.search) query.append('search', params.search);
      if (params.sort) query.append('sort', params.sort);
    }
    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async getCategories(): Promise<{ name: string; count: number }[]> {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async getProductById(id: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Product not found');
    return res.json();
  },

  async getRelatedProducts(id: number): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products/${id}/related`);
    if (!res.ok) throw new Error('Failed to fetch related products');
    return res.json();
  },

  // AI Semantic Search
  async searchAI(query: string): Promise<AISearchResponse> {
    const res = await fetch(`${API_BASE}/ai/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: getSessionId() }),
    });
    if (!res.ok) throw new Error('Failed to perform AI search');
    return res.json();
  },

  async getRecommendations(viewedIds?: number[], category?: string): Promise<Product[]> {
    const query = new URLSearchParams();
    if (viewedIds && viewedIds.length > 0) {
      query.append('viewed_ids', viewedIds.join(','));
    }
    if (category) {
      query.append('category', category);
    }
    const res = await fetch(`${API_BASE}/ai/recommendations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load recommendations');
    return res.json();
  },

  async getPopularQueries(): Promise<{ query: string; tag: string; icon: string }[]> {
    const res = await fetch(`${API_BASE}/ai/popular-queries`);
    if (!res.ok) throw new Error('Failed to fetch popular queries');
    return res.json();
  },

  // Cart
  async getCart(): Promise<CartSummary> {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/cart?session_id=${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  },

  async addToCart(productId: number, quantity: number = 1): Promise<CartSummary> {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        quantity,
        session_id: sessionId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add item to cart' }));
      throw new Error(err.detail || 'Failed to add item to cart');
    }
    return res.json();
  },

  async updateCartQuantity(cartItemId: number, quantity: number): Promise<CartSummary> {
    const res = await fetch(`${API_BASE}/cart/${cartItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update quantity' }));
      throw new Error(err.detail || 'Failed to update quantity');
    }
    return res.json();
  },

  async removeFromCart(cartItemId: number): Promise<CartSummary> {
    const res = await fetch(`${API_BASE}/cart/${cartItemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove item');
    return res.json();
  },

  async clearCart(): Promise<CartSummary> {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/cart?session_id=${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear cart');
    return res.json();
  },

  // Orders & Checkout
  async checkout(orderData: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: string;
    payment_method: string;
  }): Promise<Order> {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        ...orderData,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Checkout failed' }));
      throw new Error(err.detail || 'Checkout failed');
    }
    return res.json();
  },

  async getOrders(email?: string): Promise<Order[]> {
    const query = new URLSearchParams();
    if (email) query.append('email', email);
    const res = await fetch(`${API_BASE}/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async getOrderById(orderId: number): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },

  // Authentication
  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Invalid credentials');
    }
    return res.json();
  },

  // Admin Management
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/dashboard-stats`);
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const res = await fetch(`${API_BASE}/admin/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },

  async updateProductStock(id: number, stock_quantity: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_quantity }),
    });
    if (!res.ok) throw new Error('Failed to update stock');
    return res.json();
  },

  async deleteProduct(id: number): Promise<{ message: string; id: number }> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return res.json();
  },

  async importCSV(file: File): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/admin/import-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload CSV' }));
      throw new Error(err.detail || 'Failed to upload CSV');
    }
    return res.json();
  },

  getSampleCSVUrl(): string {
    return `${API_BASE}/admin/sample-csv`;
  }
};

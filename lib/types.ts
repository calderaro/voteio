// Database types that match the actual schema
export interface User {
  id: string;
  email: string;
  emailVerified: boolean | null;
  name: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Session {
  id: string;
  userId: string | null;
  expiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface List {
  id: string;
  name: string;
  budget: string;
  isClosed: boolean | null;
  createdAt: Date | null;
  createdBy: string | null;
}

export interface Item {
  id: string;
  listId: string | null;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  mercadoLibreUrl: string | null;
  createdAt: Date | null;
}

export interface Vote {
  id: string;
  listId: string | null;
  house: string;
  userName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  items?: VoteItem[];
}

export interface VoteItem {
  id: string;
  quantity: number;
  itemId: string | null;
  itemName: string;
  itemPrice: string;
  itemImageUrl: string | null;
}

// Helper types for forms and UI
export interface ListFormData {
  name: string;
  budget: number;
  isClosed: boolean;
}

export interface ItemFormData {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  mercadoLibreUrl?: string;
}

export interface CartItem {
  itemId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string | null;
}

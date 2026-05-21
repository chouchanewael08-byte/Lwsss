import mongoose, { Schema, Model } from 'mongoose';
import { ProductType } from '../types';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface IProduct {
  id: string;
  title: string;
  price: number;
  description: string;
  type: ProductType;
  sellerId: string;
  images: string[];
  acceptedPayments: string[];
  isSwapAcceptable: boolean;
  isNegotiable: boolean;
  warrantyPeriod: string;
  viewsCount: number;
  reportsCount: number;
  isTrend: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  discountPercentage?: number;
  credentials?: {
    email?: string | null;
    password?: string | null;
    username?: string | null;
    phone?: string | null;
    notes?: string | null;
    extra?: string | null;
  };
  hasCredentials: boolean;
  isApproved: boolean;
}

const ProductSchema = new Schema<IProduct>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true },
  sellerId: { type: String, required: true },
  images: { type: [String], default: [] },
  acceptedPayments: { type: [String], default: [] },
  isSwapAcceptable: { type: Boolean, default: false },
  isNegotiable: { type: Boolean, default: false },
  warrantyPeriod: { type: String, default: 'بدون ضمان' },
  viewsCount: { type: Number, default: 0 },
  reportsCount: { type: Number, default: 0 },
  isTrend: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  discountPercentage: { type: Number, default: 0 },
  credentials: {
    email: { type: String, default: null },
    password: { type: String, default: null },
    username: { type: String, default: null },
    phone: { type: String, default: null },
    notes: { type: String, default: null },
    extra: { type: String, default: null }
  },
  hasCredentials: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true }
}, {
  timestamps: true
});

const BaseProductModel: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const ProductModel = createMemoryModelProxy('Product', BaseProductModel) as Model<IProduct>;


import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface IUser {
  id: string; // This stores the Telegram user ID (e.g., 'user_buyer_anis')
  username: string;
  fullName: string;
  role: 'buyer' | 'seller' | 'admin' | 'moderator';
  level: 'Trusted' | 'Verified' | 'VIP' | 'High Risk' | 'Scam Suspected';
  avatar: string;
  salesCount: number;
  successRate: number;
  responseTime: string;
  totalEarnings: number;
  joinedDate: string;
  ipAddress: string;
  device: string;
  points?: number;
  isBanned: boolean;
  warnings: string[];
  commissionPercentage: number | null;
  allowWithdrawals: boolean;
  sellerLevel: string;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'admin', 'moderator'], default: 'buyer' },
  level: { type: String, enum: ['Trusted', 'Verified', 'VIP', 'High Risk', 'Scam Suspected'], default: 'Verified' },
  avatar: { type: String, default: '👤' },
  salesCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 100 },
  responseTime: { type: String, default: '5 min' },
  totalEarnings: { type: Number, default: 0 },
  joinedDate: { type: String, default: () => new Date().toISOString().substring(0, 10) },
  ipAddress: { type: String, default: '' },
  device: { type: String, default: '' },
  points: { type: Number, default: 500 },
  isBanned: { type: Boolean, default: false },
  warnings: { type: [String], default: [] },
  commissionPercentage: { type: Number, default: null },
  allowWithdrawals: { type: Boolean, default: true },
  sellerLevel: { type: String, default: 'Standard' }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      // Do not delete database id, but make sure `id` string (telegram ID) is used cleanly
      return ret;
    }
  }
});

const BaseUserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const UserModel = createMemoryModelProxy('User', BaseUserModel) as Model<IUser>;


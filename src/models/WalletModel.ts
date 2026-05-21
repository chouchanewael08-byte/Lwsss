import mongoose, { Schema, Model } from 'mongoose';
import { WalletTransaction } from '../types';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface IWallet {
  userId: string;
  username: string;
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  transactions: WalletTransaction[];
}

const WalletTransactionSchema = new Schema<WalletTransaction>({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['deposit', 'withdraw', 'escrow_hold', 'escrow_release', 'refund', 'bonus', 'referral'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['completed', 'pending', 'failed', 'frozen'], 
    required: true, 
    default: 'completed' 
  },
  description: { type: String, required: true },
  timestamp: { type: String, required: true },
  paymentMethod: { type: String, required: true }
}, { _id: false });

const WalletSchema = new Schema<IWallet>({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  availableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  frozenBalance: { type: Number, default: 0 },
  transactions: { type: [WalletTransactionSchema], default: [] }
}, {
  timestamps: true
});

const BaseWalletModel: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
export const WalletModel = createMemoryModelProxy('Wallet', BaseWalletModel) as Model<IWallet>;


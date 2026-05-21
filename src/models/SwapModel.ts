import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface ISwap {
  id: string;
  userId: string;
  username: string;
  have: string;
  want: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedWith?: string;
  roomId?: string;
  createdAt: string;
}

const SwapSchema = new Schema<ISwap>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  have: { type: String, required: true },
  want: { type: String, required: true },
  status: { type: String, enum: ['pending', 'matched', 'completed', 'cancelled'], default: 'pending' },
  matchedWith: { type: String, default: null },
  roomId: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toLocaleDateString('ar-DZ') }
}, {
  timestamps: true
});

const BaseSwapModel: Model<ISwap> = mongoose.models.Swap || mongoose.model<ISwap>('Swap', SwapSchema);
export const SwapModel = createMemoryModelProxy('Swap', BaseSwapModel) as Model<ISwap>;


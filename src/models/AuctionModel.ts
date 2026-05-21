import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface IAuction {
  id: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  startingPrice: number;
  highestBid: number;
  highestBidderId?: string;
  highestBidderName?: string;
  endTime: string;
  bidsCount: number;
  isCompleted: boolean;
  createdAt: string;
}

const AuctionSchema = new Schema<IAuction>({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productTitle: { type: String, required: true },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  startingPrice: { type: Number, required: true },
  highestBid: { type: Number, required: true },
  highestBidderId: { type: String, default: null },
  highestBidderName: { type: String, default: null },
  endTime: { type: String, required: true },
  bidsCount: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true
});

const BaseAuctionModel: Model<IAuction> = mongoose.models.Auction || mongoose.model<IAuction>('Auction', AuctionSchema);
export const AuctionModel = createMemoryModelProxy('Auction', BaseAuctionModel) as Model<IAuction>;


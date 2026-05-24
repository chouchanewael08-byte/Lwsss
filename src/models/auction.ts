import mongoose, { Schema } from 'mongoose';

const AuctionSchema = new Schema({
  productId:         { type: String, required: true },
  productTitle:      { type: String, required: true },
  productImages:     { type: [String], default: [] },
  sellerId:          { type: String, required: true, index: true },
  sellerName:        { type: String, required: true },
  startingPrice:     { type: Number, required: true, min: 1 },
  currentBid:        { type: Number, required: true },
  currentBidderId:   { type: String, default: null },
  currentBidderName: { type: String, default: null },
  bids: [{
    userId:    String,
    username:  String,
    amount:    Number,
    timestamp: { type: Date, default: Date.now },
  }],
  endAt:       { type: Date, required: true },
  isCompleted: { type: Boolean, default: false },
  winnerId:    { type: String, default: null },
}, { timestamps: true });

AuctionSchema.index({ isCompleted: 1, endAt: 1 });

export const Auction = mongoose.models.Auction || mongoose.model('Auction', AuctionSchema);

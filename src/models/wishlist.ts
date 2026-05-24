import mongoose, { Schema } from 'mongoose';
const WishlistSchema = new Schema({
  userId:       { type: String, required: true, index: true },
  productId:    { type: String, required: true },
  productType:  { type: String, enum: ['market','accounts'], default: 'market' },
  productTitle: { type: String, required: true },
  productPrice: { type: Number, required: true },
  productImage: { type: String, default: null },
  sellerId:     { type: String, required: true },
  sellerName:   { type: String, required: true },
}, { timestamps: true });
WishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);

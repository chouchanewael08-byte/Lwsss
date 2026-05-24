import mongoose, { Schema } from 'mongoose';
const ReviewSchema = new Schema({
  reviewerId:    { type: String, required: true, index: true },
  reviewerName:  { type: String, required: true },
  sellerId:      { type: String, required: true, index: true },
  productId:     { type: String, required: true },
  productTitle:  { type: String, required: true },
  ticketId:      { type: String, required: true },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  comment:       { type: String, default: '', maxlength: 500 },
  sellerReply:   { type: String, default: null, maxlength: 300 },
  sellerReplyAt: { type: Date,   default: null },
}, { timestamps: true });
ReviewSchema.index({ ticketId: 1 }, { unique: true });
ReviewSchema.index({ sellerId: 1, createdAt: -1 });
export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

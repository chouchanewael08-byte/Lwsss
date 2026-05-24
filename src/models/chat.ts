import mongoose, { Schema } from 'mongoose';

const ChatMessageSchema = new Schema({
  senderId:   String,
  senderName: String,
  text:       { type: String, maxlength: 1000 },
  isSystem:   { type: Boolean, default: false },
  timestamp:  { type: Date, default: Date.now },
}, { _id: false });

const ChatSchema = new Schema({
  productId:   { type: String, required: true },
  productType: { type: String, enum: ['market','accounts'], default: 'market' },
  buyerId:     { type: String, required: true, index: true },
  sellerId:    { type: String, required: true, index: true },
  ticketId:    { type: String, default: null },
  messages:    { type: [ChatMessageSchema], default: [] },
  isOpen:      { type: Boolean, default: true },
  hasDeal:     { type: Boolean, default: false },
  agreedPrice: { type: Number, default: null },
}, { timestamps: true });

ChatSchema.index({ buyerId: 1, sellerId: 1, productId: 1 });

export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

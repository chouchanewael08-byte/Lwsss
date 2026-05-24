import mongoose, { Schema } from 'mongoose';

const TicketMessageSchema = new Schema({
  senderId:    String,
  senderName:  String,
  senderRole:  { type: String, enum: ['buyer','seller','admin','system'] },
  text:        String,
  isSystemMessage: { type: Boolean, default: false },
  timestamp:   { type: Date, default: Date.now },
}, { _id: false });

const TicketSchema = new Schema({
  productId:    { type: String, required: true },
  productTitle: { type: String, required: true },
  productType:  { type: String, enum: ['market','accounts'], default: 'market' },
  buyerId:      { type: String, required: true, index: true },
  buyerName:    { type: String, required: true },
  sellerId:     { type: String, required: true, index: true },
  sellerName:   { type: String, required: true },
  amount:       { type: Number, required: true, min: 0 },
  amountUSD:    { type: Number, default: 0 },
  commission:   { type: Number, default: 0 },
  netAmount:    { type: Number, default: 0 },
  paymentMethod:     { type: String, required: true },
  paymentProofImage: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending_payment','payment_confirmed','partial_revealed','full_revealed','completed','disputed','refunded','auto_completed'],
    default: 'pending_payment',
  },
  partialRevealed: { type: Boolean, default: false },
  fullRevealed:    { type: Boolean, default: false },
  buyerConfirmed:  { type: Boolean, default: false },
  disputeReason:   { type: String, default: null },
  disputeOpenedAt: { type: Date, default: null },
  autoCompleteAt:  { type: Date, default: null },
  completedAt:     { type: Date, default: null },
  messages:        { type: [TicketMessageSchema], default: [] },
}, { timestamps: true });

TicketSchema.index({ status: 1, autoCompleteAt: 1 });
TicketSchema.index({ buyerId: 1, status: 1 });
TicketSchema.index({ sellerId: 1, status: 1 });

export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

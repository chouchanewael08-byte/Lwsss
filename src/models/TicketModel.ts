import mongoose, { Schema, Model } from 'mongoose';
import { TicketStatus, DisputePriority, TicketMessage } from '../types';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface ITicket {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessage[];
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  disputePriority?: DisputePriority;
  disputeReason?: string;
  notes?: string;
}

const TicketMessageSchema = new Schema<TicketMessage>({
  id: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true }
}, { _id: false });

const EscrowTicketSchema = new Schema<ITicket>({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productTitle: { type: String, required: true },
  price: { type: Number, required: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  status: { type: String, required: true, default: 'waiting_payment' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  messages: { type: [TicketMessageSchema], default: [] },
  buyerConfirmed: { type: Boolean, default: false },
  sellerConfirmed: { type: Boolean, default: false },
  disputePriority: { type: String, enum: ['high', 'medium', 'low', null], default: null },
  disputeReason: { type: String, default: null },
  notes: { type: String, default: null }
}, {
  timestamps: true
});

const BaseEscrowTicketModel: Model<ITicket> = mongoose.models.EscrowTicket || mongoose.model<ITicket>('EscrowTicket', EscrowTicketSchema);
export const EscrowTicketModel = createMemoryModelProxy('EscrowTicket', BaseEscrowTicketModel) as Model<ITicket>;


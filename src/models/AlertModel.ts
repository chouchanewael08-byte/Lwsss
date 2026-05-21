import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface ISecurityAlert {
  id: string;
  userId: string;
  username: string;
  type: 'suspicious_link' | 'multi_account' | 'spam' | 'external_payment_attempt';
  severity: 'low' | 'medium' | 'critical';
  details: string;
  timestamp: string;
  status: 'new' | 'investigated' | 'resolved';
}

const SecurityAlertSchema = new Schema<ISecurityAlert>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['suspicious_link', 'multi_account', 'spam', 'external_payment_attempt'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'critical'], 
    required: true 
  },
  details: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  status: { 
    type: String, 
    enum: ['new', 'investigated', 'resolved'], 
    default: 'new' 
  }
}, {
  timestamps: true
});

const BaseSecurityAlertModel: Model<ISecurityAlert> = mongoose.models.SecurityAlert || mongoose.model<ISecurityAlert>('SecurityAlert', SecurityAlertSchema);
export const SecurityAlertModel = createMemoryModelProxy('SecurityAlert', BaseSecurityAlertModel) as Model<ISecurityAlert>;


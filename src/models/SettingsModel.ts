import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface ISettings {
  generalCommission: number;
  escrowAutoReleaseHrs: number;
  maintenanceMode: boolean;
  acceptedPaymentMethods: string[];
  categories: string[];
  limits: {
    minTx: number;
    maxTx: number;
  };
}

const SettingsSchema = new Schema<ISettings>({
  generalCommission: { type: Number, default: 10 },
  escrowAutoReleaseHrs: { type: Number, default: 72 },
  maintenanceMode: { type: Boolean, default: false },
  acceptedPaymentMethods: { type: [String], default: ['BaridiMob', 'CCP', 'USDT', 'Flexy', 'Binance'] },
  categories: { type: [String], default: ['game_account', 'subscription', 'digital_service', 'game_currency', 'social_media', 'design_dev', 'swap_item'] },
  limits: {
    minTx: { type: Number, default: 1 },
    maxTx: { type: Number, default: 5000 }
  }
}, {
  timestamps: true
});

const BaseSettingsModel: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
export const SettingsModel = createMemoryModelProxy('Settings', BaseSettingsModel) as Model<ISettings>;


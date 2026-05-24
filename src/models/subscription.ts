import mongoose, { Schema } from 'mongoose';

const SubscriptionSchema = new Schema({
  userId:    { type: String, required: true, unique: true, index: true },
  plan:      { type: String, enum: ['free', 'silver', 'gold', 'vip'], default: 'free' },
  expiresAt: { type: Date, default: null },
  perks: {
    maxProducts:     { type: Number, default: 5 },
    commissionRate:  { type: Number, default: 5 },    // % عمولة أقل
    featuredSlots:   { type: Number, default: 0 },
    prioritySupport: { type: Boolean, default: false },
  }
}, { timestamps: true });

export const Subscription = mongoose.models.Subscription
  || mongoose.model('Subscription', SubscriptionSchema);

// Plan definitions
export const PLANS = {
  free:   { maxProducts: 5,   commissionRate: 5,   featuredSlots: 0, price: 0 },
  silver: { maxProducts: 20,  commissionRate: 4,   featuredSlots: 1, price: 500  },  // 500 crystals/month
  gold:   { maxProducts: 50,  commissionRate: 3,   featuredSlots: 3, price: 1200 },
  vip:    { maxProducts: 999, commissionRate: 2,   featuredSlots: 10, price: 2500 },
};

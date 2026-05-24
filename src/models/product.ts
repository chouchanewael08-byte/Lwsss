import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema({
  title:       { type: String, required: true, maxlength: 100, trim: true },
  description: { type: String, required: true, maxlength: 1000 },
  price:       { type: Number, required: true, min: 1, max: 999999 },
  priceUSD:    { type: Number, default: 0 },
  type:        { type: String, required: true },
  sellerId:    { type: String, required: true, index: true },
  sellerName:  { type: String, required: true },
  images:      { type: [String], default: [], validate: [(a: string[]) => a.length <= 5, 'أقصى 5 صور'] },
  videos:      { type: [String], default: [] },
  acceptedPayments:  { type: [String], default: [] },
  isSwapAcceptable:  { type: Boolean, default: false },
  isNegotiable:      { type: Boolean, default: false },
  warrantyPeriod:    { type: String, default: 'بدون ضمان' },
  discountPercent:   { type: Number, default: 0, min: 0, max: 100 },
  viewsCount:        { type: Number, default: 0, min: 0 },
  isTrend:           { type: Boolean, default: false },
  isFeatured:        { type: Boolean, default: false },
  featuredUntil:     { type: Date, default: null },
  isHidden:          { type: Boolean, default: false },
  isApproved:        { type: Boolean, default: false },
  credentialsEncrypted: { type: String, default: null, select: false }, // مخفي افتراضياً
}, { timestamps: true });

ProductSchema.index({ isApproved: 1, isHidden: 1, createdAt: -1 });
ProductSchema.index({ sellerId: 1, isApproved: 1, isHidden: 1 });
ProductSchema.index({ isFeatured: 1, isApproved: 1, isHidden: 1 });
ProductSchema.index({ title: 'text', description: 'text' }); // للبحث النصي

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const AccountProductSchema = new Schema({
  title:       { type: String, required: true, maxlength: 100, trim: true },
  description: { type: String, required: true, maxlength: 1000 },
  platform:    { type: String, required: true },
  price:       { type: Number, required: true, min: 1 },
  priceUSD:    { type: Number, default: 0 },
  sellerId:    { type: String, required: true, index: true },
  sellerName:  { type: String, required: true },
  images:      { type: [String], default: [] },
  acceptedPayments: { type: [String], default: [] },
  accountAge:       { type: String, default: '' },
  accountLevel:     { type: String, default: '' },
  followersCount:   { type: String, default: '' },
  region:           { type: String, default: '' },
  extras:           { type: String, default: '' },
  isNegotiable:     { type: Boolean, default: false },
  warrantyPeriod:   { type: String, default: 'بدون ضمان' },
  discountPercent:  { type: Number, default: 0, min: 0, max: 100 },
  viewsCount:       { type: Number, default: 0, min: 0 },
  isFeatured:       { type: Boolean, default: false },
  featuredUntil:    { type: Date, default: null },
  isHidden:         { type: Boolean, default: false },
  isApproved:       { type: Boolean, default: false },
  credentialsEncrypted: { type: String, default: null, select: false },
}, { timestamps: true });

AccountProductSchema.index({ isApproved: 1, isHidden: 1, createdAt: -1 });
AccountProductSchema.index({ platform: 1, isApproved: 1, isHidden: 1 });

export const AccountProduct = mongoose.models.AccountProduct || mongoose.model('AccountProduct', AccountProductSchema);

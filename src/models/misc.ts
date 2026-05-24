// نماذج متفرقة: Task, Coupon, Swap, Settings, SystemLog, Notification, PointsItem, SellerSubscription
import mongoose, { Schema } from 'mongoose';

// ─── Task ─────────────────────────────────────────────────────
const TaskSchema = new Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: '🎯' },
  starsReward: { type: Number, required: true, min: 1 },
  type:        { type: String, enum: ['channel_join','bot_start','invite','purchase','custom'], default: 'custom' },
  link:        { type: String, default: '' },
  channelId:   { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  completedBy: { type: [String], default: [] },
}, { timestamps: true });
TaskSchema.index({ isActive: 1 });
export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

// ─── Coupon ───────────────────────────────────────────────────
const CouponSchema = new Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType:  { type: String, enum: ['percent','fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minPurchase:   { type: Number, default: 0 },
  maxUses:       { type: Number, default: 100 },
  usedCount:     { type: Number, default: 0 },
  usedBy:        { type: [String], default: [] },
  expiresAt:     { type: Date, required: true },
  isActive:      { type: Boolean, default: true },
  appliesTo:     { type: String, enum: ['all','market','accounts'], default: 'all' },
  sellerId:      { type: String, default: null },
  createdBy:     { type: String, required: true },
}, { timestamps: true });
CouponSchema.index({ code: 1, isActive: 1, expiresAt: 1 });
export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

// ─── Swap ─────────────────────────────────────────────────────
const SwapSchema = new Schema({
  userId:        { type: String, required: true, index: true },
  username:      { type: String, required: true },
  have:          { type: String, required: true },
  want:          { type: String, required: true },
  status:        { type: String, enum: ['open','matched','completed','cancelled'], default: 'open' },
  matchedWithId: { type: String, default: null },
}, { timestamps: true });
export const Swap = mongoose.models.Swap || mongoose.model('Swap', SwapSchema);

// ─── Settings ─────────────────────────────────────────────────
const SettingsSchema = new Schema({
  key:   { type: String, unique: true, required: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// ─── SystemLog ────────────────────────────────────────────────
const SystemLogSchema = new Schema({
  adminId:   { type: String, required: true, index: true },
  adminName: { type: String, required: true },
  action:    { type: String, required: true },
  details:   { type: String, required: true },
}, { timestamps: true });
SystemLogSchema.index({ createdAt: -1 });
export const SystemLog = mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);

// ─── Notification ─────────────────────────────────────────────
const NotificationSchema = new Schema({
  userId:  { type: String, required: true, index: true },
  type:    { type: String, required: true },
  icon:    { type: String, default: '🔔' },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  isRead:  { type: Boolean, default: false },
  link:    { type: String, default: null },
  data:    { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// ─── PointsItem ───────────────────────────────────────────────
const PointsItemSchema = new Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, enum: ['gift_card','subscription','game_currency','custom'], default: 'custom' },
  starsCost:   { type: Number, required: true, min: 1 },
  images:      { type: [String], default: [] },
  stock:       { type: Number, default: -1 },
  isActive:    { type: Boolean, default: true },
  credentialsEncrypted: { type: String, default: '', select: false },
  soldCount:   { type: Number, default: 0, min: 0 },
}, { timestamps: true });
export const PointsItem = mongoose.models.PointsItem || mongoose.model('PointsItem', PointsItemSchema);

// ─── SellerSubscription ───────────────────────────────────────
const SellerSubscriptionSchema = new Schema({
  userId:     { type: String, required: true, index: true },
  plan:       { type: String, enum: ['standard','silver','gold','vip'], default: 'standard' },
  priceUSD:   { type: Number, default: 0 },
  commission: { type: Number, default: 7 },
  startedAt:  { type: Date, default: Date.now },
  expiresAt:  { type: Date, required: true },
  isActive:   { type: Boolean, default: true },
  paymentRef: { type: String, default: null },
}, { timestamps: true });
SellerSubscriptionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });
export const SellerSubscription = mongoose.models.SellerSubscription || mongoose.model('SellerSubscription', SellerSubscriptionSchema);

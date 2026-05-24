import mongoose, { Schema } from 'mongoose';
const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type:   { type: String, enum: ['ticket','payment','deposit','withdraw','bid','review','task','system','referral'], required: true },
  icon:   { type: String, default: '🔔' },
  title:  { type: String, required: true, maxlength: 100 },
  body:   { type: String, required: true, maxlength: 300 },
  isRead: { type: Boolean, default: false },
  link:   { type: String, default: null },
  data:   { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

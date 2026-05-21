import mongoose, { Schema, Model } from 'mongoose';
import { createMemoryModelProxy } from '../config/memoryDb';

export interface ISystemLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}

const SystemLogSchema = new Schema<ISystemLog>({
  id: { type: String, required: true, unique: true },
  adminId: { type: String, required: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true
});

const BaseSystemLogModel: Model<ISystemLog> = mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
export const SystemLogModel = createMemoryModelProxy('SystemLog', BaseSystemLogModel) as Model<ISystemLog>;


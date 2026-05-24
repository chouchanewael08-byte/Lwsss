import { Server as SocketServer } from 'socket.io';
import { Settings, SystemLog } from '../models/index.js';

let _io: SocketServer | null = null;
export function setIO(io: SocketServer) { _io = io; }
export function emitToUser(room: string, event: string, data: any) {
  _io?.to(room).emit(event, data);
}

interface CacheEntry { value: any; expiresAt: number; }
const settingsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS  = 60_000;

export async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  const cached = settingsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  try {
    const doc   = await Settings.findOne({ key }).lean();
    const value = doc && !Array.isArray(doc) ? (doc as any).value : defaultValue;
    settingsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch { return defaultValue; }
}

export async function setSetting(key: string, value: any): Promise<void> {
  await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
  settingsCache.delete(key);
}

export function invalidateSettingsCache() { settingsCache.clear(); }

export async function getOrCreateWallet(userId: string) {
  const { Wallet } = await import('../models/index.js');
  let w = await Wallet.findOne({ userId });
  if (!w) w = await Wallet.create({ userId });
  return w;
}

export async function getCrystalPriceUSD(): Promise<number> {
  return parseFloat(await getSetting('crystalPriceUSD', 0.01)) || 0.01;
}

export async function getCommissionPercent(): Promise<number> {
  return parseFloat(await getSetting('commissionPercent', 5)) || 5;
}

export async function addSystemLog(adminId: string, adminName: string, action: string, details: string) {
  await SystemLog.create({ adminId, adminName, action, details }).catch(() => {});
}

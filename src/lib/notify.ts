export async function createNotification(
  userId: string, type: string, icon: string,
  title: string, body: string, link?: string, data?: any
) {
  try {
    const { Notification } = await import('../models/notification.js');
    await Notification.create({ userId, type, icon, title, body, link: link ?? null, data: data ?? null });
    const count = await Notification.countDocuments({ userId });
    if (count > 100) {
      const oldest = await Notification.find({ userId }).sort({ createdAt: 1 }).limit(count - 100).select('_id');
      await Notification.deleteMany({ _id: { $in: oldest.map((n: any) => n._id) } });
    }
  } catch {}
}

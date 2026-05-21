import { UserModel } from './models/UserModel';
import { ProductModel } from './models/ProductModel';
import { WalletModel } from './models/WalletModel';
import { SettingsModel } from './models/SettingsModel';
import { EscrowTicketModel } from './models/TicketModel';
import { SwapModel } from './models/SwapModel';
import { AuctionModel } from './models/AuctionModel';
import { SecurityAlertModel } from './models/AlertModel';
import { SystemLogModel } from './models/SystemLogModel';

import { 
  initialUsers, 
  initialProducts, 
  initialWallets,
  initialTickets,
  initialSwaps,
  initialAuctions,
  initialSecurityAlerts,
  initialLogs
} from './data';

export async function seedDatabase() {
  try {
    console.log('[SkyMarket Seed] Checking database hydration status...');

    // 1. Seed Settings
    const settingsCount = await SettingsModel.countDocuments();
    if (settingsCount === 0) {
      console.log('[SkyMarket Seed] Seeding platform settings...');
      await SettingsModel.create({
        generalCommission: 10,
        escrowAutoReleaseHrs: 72,
        maintenanceMode: false,
        acceptedPaymentMethods: ['BaridiMob', 'CCP', 'USDT', 'Flexy', 'Binance'],
        categories: ['game_account', 'subscription', 'digital_service', 'game_currency', 'social_media', 'design_dev', 'swap_item'],
        limits: { minTx: 1, maxTx: 5000 }
      });
    }

    // 2. Seed Users
    const usersCount = await UserModel.countDocuments();
    if (usersCount === 0) {
      console.log('[SkyMarket Seed] Seeding default mock users...');
      await UserModel.insertMany(initialUsers.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        level: u.level,
        avatar: u.avatar || '👤',
        salesCount: u.salesCount || 0,
        successRate: u.successRate || 100,
        responseTime: u.responseTime || '5 min',
        totalEarnings: u.totalEarnings || 0,
        joinedDate: u.joinedDate || new Date().toISOString().substring(0, 10),
        ipAddress: u.ipAddress || '127.0.0.1',
        device: u.device || 'Desktop client (Windows 11)',
        points: u.points || 500,
        isBanned: false,
        warnings: [],
        commissionPercentage: null,
        allowWithdrawals: true,
        sellerLevel: 'Standard'
      })));
    }

    // 3. Seed Products
    const productsCount = await ProductModel.countDocuments();
    if (productsCount === 0) {
      console.log('[SkyMarket Seed] Seeding initial marketplace products...');
      await ProductModel.insertMany(initialProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        description: p.description,
        type: p.type,
        sellerId: p.sellerId,
        images: p.images,
        acceptedPayments: p.acceptedPayments,
        isSwapAcceptable: p.isSwapAcceptable,
        isNegotiable: p.isNegotiable,
        warrantyPeriod: p.warrantyPeriod || 'بدون ضمان',
        viewsCount: p.viewsCount || 0,
        reportsCount: p.reportsCount || 0,
        isTrend: !!p.isTrend,
        isFeatured: !!p.isFeatured,
        isHidden: !!p.isHidden,
        discountPercentage: p.discountPercentage || 0,
        credentials: {
          email: 'sample@skymarket.vip',
          password: 'password_demo_123',
          username: 'demo_user',
          phone: '+213555123456',
          notes: 'هذه معلومات بيانات الحساب المؤمن تلقائياً.',
          extra: 'تأكد من تغيير الرمز السري بعد الشراء مباشرة.'
        },
        hasCredentials: true,
        isApproved: true
      })));
    }

    // 4. Seed Wallets
    const walletsCount = await WalletModel.countDocuments();
    if (walletsCount === 0) {
      console.log('[SkyMarket Seed] Seeding default shopper wallets...');
      await WalletModel.insertMany(initialWallets.map(w => ({
        userId: w.userId,
        username: w.username,
        availableBalance: w.availableBalance,
        pendingBalance: w.pendingBalance,
        frozenBalance: w.frozenBalance,
        transactions: w.transactions || []
      })));
    }

    // 5. Seed Tickets
    const ticketsCount = await EscrowTicketModel.countDocuments();
    if (ticketsCount === 0) {
      console.log('[SkyMarket Seed] Seeding baseline escrow tickets...');
      await EscrowTicketModel.insertMany(initialTickets.map(t => ({
        id: t.id,
        productId: t.productId,
        productTitle: t.productTitle,
        price: t.price,
        buyerId: t.buyerId,
        buyerName: t.buyerName,
        sellerId: t.sellerId,
        sellerName: t.sellerName,
        status: t.status,
        createdAt: t.createdAt || new Date().toISOString(),
        messages: t.messages || [],
        buyerConfirmed: !!t.buyerConfirmed,
        sellerConfirmed: !!t.sellerConfirmed,
        disputePriority: t.disputePriority || null,
        disputeReason: t.disputeReason || null,
        notes: t.notes || null
      })));
    }

    // 6. Seed Swaps
    const swapsCount = await SwapModel.countDocuments();
    if (swapsCount === 0) {
      console.log('[SkyMarket Seed] Seeding baseline swap requests...');
      await SwapModel.insertMany(initialSwaps.map(s => ({
        id: s.id,
        userId: s.userId,
        username: s.username,
        have: s.have,
        want: s.want,
        status: s.status,
        matchedWith: s.matchedWith || null,
        roomId: s.roomId || null,
        createdAt: s.createdAt || new Date().toLocaleDateString('ar-DZ')
      })));
    }

    // 7. Seed Auctions
    const auctionsCount = await AuctionModel.countDocuments();
    if (auctionsCount === 0) {
      console.log('[SkyMarket Seed] Seeding baseline auctions...');
      await AuctionModel.insertMany(initialAuctions.map(a => ({
        id: a.id,
        productId: a.productId,
        productTitle: a.productTitle,
        sellerId: a.sellerId,
        sellerName: a.sellerName,
        startingPrice: a.startingPrice,
        highestBid: a.highestBid,
        highestBidderId: a.highestBidderId || null,
        highestBidderName: a.highestBidderName || null,
        endTime: a.endTime,
        bidsCount: a.bidsCount || 0,
        isCompleted: !!a.isCompleted,
        createdAt: a.createdAt || new Date().toISOString()
      })));
    }

    // 8. Seed Security Alerts
    const alertsCount = await SecurityAlertModel.countDocuments();
    if (alertsCount === 0) {
      console.log('[SkyMarket Seed] Seeding baseline security logs...');
      await SecurityAlertModel.insertMany(initialSecurityAlerts.map(a => ({
        id: a.id,
        userId: a.userId,
        username: a.username,
        type: a.type,
        severity: a.severity,
        details: a.details,
        timestamp: a.timestamp || new Date().toISOString(),
        status: a.status || 'new'
      })));
    }

    // 9. Seed System Logs
    const logsCount = await SystemLogModel.countDocuments();
    if (logsCount === 0) {
      console.log('[SkyMarket Seed] Seeding baseline admin history logs...');
      await SystemLogModel.insertMany(initialLogs.map(l => ({
        id: l.id,
        adminId: l.adminId,
        adminName: l.adminName,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp || new Date().toISOString()
      })));
    }

    console.log('[SkyMarket Seed] Database checks and hydration completed successfully.');
  } catch (error) {
    console.error('[SkyMarket Seed] Seeding failed:', error);
  }
}

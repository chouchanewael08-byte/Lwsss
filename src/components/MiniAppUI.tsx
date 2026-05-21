import React, { useState, Suspense } from 'react';
import { TelegramUser } from '../types';

// Lazy load tab components
const MarketTab = React.lazy(() => import('./tabs/MarketTab'));
const SellerTab = React.lazy(() => import('./tabs/SellerTab'));
const EscrowTab = React.lazy(() => import('./tabs/EscrowTab'));
const WalletTab = React.lazy(() => import('./tabs/WalletTab'));
const PointsTab = React.lazy(() => import('./tabs/PointsTab'));
const SwapTab = React.lazy(() => import('./tabs/SwapTab'));
const AuctionTab = React.lazy(() => import('./tabs/AuctionTab'));
const AdminTab = React.lazy(() => import('./tabs/AdminTab'));
const ProfileTab = React.lazy(() => import('./tabs/ProfileTab'));

interface MiniAppUIProps {
  currentUser: TelegramUser;
  activeTab: string;
  onStateChange: () => void;
  onNavigateToTab: (tab: string) => void;
}

// Elegant Arabic skeleton loader
const TabSkeleton = () => (
  <div className="animate-pulse space-y-6 text-right p-4 font-sans" dir="rtl">
    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-3">
      <div className="h-4 bg-slate-800 rounded w-1/4"></div>
      <div className="h-6 bg-slate-800 rounded w-1/2"></div>
      <div className="h-3 bg-slate-800 rounded w-3/4"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div className="md:col-span-4 bg-slate-900 p-5 rounded-2xl space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="h-8 bg-slate-800 rounded w-full"></div>
          <div className="h-8 bg-slate-800 rounded w-full"></div>
          <div className="h-10 bg-slate-800 rounded w-full"></div>
        </div>
      </div>
      <div className="md:col-span-8 bg-slate-900 p-5 rounded-2xl space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-800 rounded w-full"></div>
          <div className="h-16 bg-slate-800 rounded w-full"></div>
          <div className="h-16 bg-slate-800 rounded w-full"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function MiniAppUI({
  currentUser,
  activeTab,
  onStateChange,
  onNavigateToTab
}: MiniAppUIProps) {
  // We keep track of the selected active escrow chat / ticket ID across navigation
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <MarketTab 
            onNavigateToTab={onNavigateToTab} 
            setActiveTicketId={setActiveTicketId} 
          />
        );
      case 'seller':
        return <SellerTab onNavigateToTab={onNavigateToTab} />;
      case 'tickets':
        return (
          <EscrowTab 
            activeTicketId={activeTicketId} 
            setActiveTicketId={setActiveTicketId} 
          />
        );
      case 'wallet':
        return <WalletTab />;
      case 'points':
        return <PointsTab />;
      case 'swap':
        return <SwapTab />;
      case 'auctions':
        return <AuctionTab />;
      case 'admin':
        return <AdminTab />;
      case 'profile':
        return <ProfileTab />;
      default:
        return (
          <MarketTab 
            onNavigateToTab={onNavigateToTab} 
            setActiveTicketId={setActiveTicketId} 
          />
        );
    }
  };

  return (
    <div className="w-full">
      <Suspense fallback={<TabSkeleton />}>
        {renderActiveTabContent()}
      </Suspense>
    </div>
  );
}

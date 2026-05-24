import { ShoppingBag, Gamepad2, Star, Store, CheckSquare, Wallet, User, Shield, Gavel, ArrowLeftRight, Settings } from 'lucide-react';
import type { TabName } from '../../App.js';
import { haptic } from '../../lib/api.js';

const tabs = [
  { id: 'market',   icon: ShoppingBag,     label: 'السوق'   },
  { id: 'accounts', icon: Gamepad2,        label: 'حسابات'  },
  { id: 'mystore',  icon: Store,           label: 'متجري'   },
  { id: 'tasks',    icon: CheckSquare,     label: 'مهام'    },
  { id: 'wallet',   icon: Wallet,          label: 'محفظة'   },
  { id: 'profile',  icon: User,            label: 'ملفي'    },
  { id: 'escrow',   icon: Shield,          label: 'صفقات'   },
  { id: 'points',   icon: Star,            label: 'نقاط'    },
  { id: 'auction',  icon: Gavel,           label: 'مزاد'    },
  { id: 'swap',     icon: ArrowLeftRight,  label: 'تبادل'   },
];

interface Props {
  active: TabName;
  onChange: (tab: TabName) => void;
  isAdmin: boolean;
  crystals?: number;
}

export default function BottomNav({ active, onChange, isAdmin, crystals }: Props) {
  const allTabs = [
    ...tabs,
    ...(isAdmin ? [{ id: 'admin', icon: Settings, label: 'إدارة' }] : [])
  ];

  return (
    <div className="bottom-nav flex-shrink-0 overflow-x-auto">
      <div className="flex min-w-max px-2 py-1.5 gap-0.5">
        {allTabs.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { haptic('light'); onChange(id as TabName); }}
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon-wrap">
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
              </div>
              <span className="nav-label">{label}</span>
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 18, height: 2, borderRadius: 2,
                  background: 'var(--c-green3)',
                  boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                  display: 'block',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

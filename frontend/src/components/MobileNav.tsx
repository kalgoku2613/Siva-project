import React from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Thermometer,
  Radio,
  Sliders
} from 'lucide-react';
import { TabType } from '../types';

interface MobileNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const items: { id: TabType; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'robot', label: 'Cockpit', icon: Gamepad2 },
    { id: 'sensors', label: 'Sensors', icon: Thermometer },
    { id: 'devices', label: 'Wi-Fi & ESP', icon: Radio },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  return (
    <nav className="mobile-nav" role="navigation" aria-label="Mobile Navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
            aria-label={item.label}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={20} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

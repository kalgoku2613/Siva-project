import React from 'react';
import {
  LayoutDashboard,
  Camera,
  Gamepad2,
  Thermometer,
  Droplets,
  TrendingUp,
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
    { id: 'camera', label: 'Cam', icon: Camera },
    { id: 'robot', label: 'Drive', icon: Gamepad2 },
    { id: 'sensors', label: 'Sensors', icon: Thermometer },
    { id: 'moisture', label: 'Soil', icon: Droplets },
    { id: 'predictions', label: 'AI', icon: TrendingUp },
    { id: 'settings', label: 'Config', icon: Sliders }
  ];

  return (
    <nav className="mobile-nav">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

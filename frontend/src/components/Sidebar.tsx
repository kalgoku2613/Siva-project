import React from 'react';
import {
  LayoutDashboard,
  Camera,
  Gamepad2,
  Thermometer,
  Droplets,
  Cpu,
  TrendingUp,
  BarChart3,
  Radio,
  Terminal,
  Sliders,
  Wifi
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems: { id: TabType; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'camera', label: 'Live Camera', icon: Camera },
    { id: 'robot', label: 'Robot Driving', icon: Gamepad2 },
    { id: 'sensors', label: 'Sensors', icon: Thermometer },
    { id: 'moisture', label: 'Soil Deployment', icon: Droplets },
    { id: 'automation', label: 'Automation', icon: Cpu },
    { id: 'predictions', label: 'AI Forecasting', icon: TrendingUp },
    { id: 'history', label: 'Analytics', icon: BarChart3 },
    { id: 'devices', label: 'Devices & Ping', icon: Radio },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.5rem 1.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: '1rem'
        }}>
          ESP
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Smart Control</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Local IoT Platform</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '0.5rem' }}>
        <Wifi size={14} color="var(--success)" />
        <span>Local LAN Connected</span>
      </div>
    </aside>
  );
};

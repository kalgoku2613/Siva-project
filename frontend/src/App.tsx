import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { HealthModal } from './components/HealthModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { CameraPage } from './pages/CameraPage';
import { RobotPage } from './pages/RobotPage';
import { SensorsPage } from './pages/SensorsPage';
import { MoisturePage } from './pages/MoisturePage';
import { AutomationPage } from './pages/AutomationPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DevicesPage } from './pages/DevicesPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { SettingsPage } from './pages/SettingsPage';

// Types & Services
import { TabType, SensorReading, DeviceStatus, SystemHealthReport } from './types';
import { api } from './services/api';
import { wsClient } from './services/websocket';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [telemetry, setTelemetry] = useState<SensorReading | null>(null);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Health Check Modal State
  const [healthOpen, setHealthOpen] = useState<boolean>(false);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  // Offline detection
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // WebSocket & Polling Sync
  useEffect(() => {
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((data) => {
      setTelemetry(data.telemetry);
      setDevices(data.devices);
      setLastDataTimestamp(Date.now());
    });

    const initLoad = async () => {
      try {
        const res = await api.getSystemStatus();
        setDevices(res.devices);
        setTelemetry(res.telemetry);
        setSimulationMode(res.simulationMode);
        setLastDataTimestamp(Date.now());
      } catch {}
    };
    initLoad();

    // Secondary HTTP fallback polling every 5s if WS drops
    const pollInterval = setInterval(initLoad, 5000);

    // Stale data counter interval
    const timeInterval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastDataTimestamp) / 1000));
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, [lastDataTimestamp]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleEmergencyStop = async () => {
    try {
      await api.emergencyStop();
    } catch {}
  };

  const handleRunHealthCheck = async () => {
    setHealthOpen(true);
    setHealthLoading(true);
    try {
      const res = await api.getHealthReport();
      setHealthReport(res.report);
    } catch (e) {
      console.error(e);
    } finally {
      setHealthLoading(false);
    }
  };

  const esp1 = devices.find(d => d.id === 'ESP1');
  const esp2 = devices.find(d => d.id === 'ESP2');
  const isDataStale = secondsAgo > 8;

  return (
    <div className="app-container">
      {/* Desktop Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main App Workspace */}
      <div className="main-content">
        {/* Offline & Stale Telemetry Warning Banner */}
        {(!isBrowserOnline || isDataStale) && (
          <div className="offline-banner" style={{ marginBottom: '1.25rem', borderRadius: '12px' }}>
            <span>
              {!isBrowserOnline
                ? '⚠️ Browser Offline (PWA Shell Active) — Connect to your local Wi-Fi to reach ESP32 microcontrollers.'
                : `⚠️ Telemetry delayed: Last updated ${secondsAgo} seconds ago. Reconnecting to local hub...`}
            </span>
          </div>
        )}

        {/* Global App Header */}
        <Header
          devices={devices}
          simulationMode={simulationMode}
          onEmergencyStop={handleEmergencyStop}
          onRunHealthCheck={handleRunHealthCheck}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Active Page View */}
        <main>
          {currentTab === 'dashboard' && (
            <Dashboard telemetry={telemetry} devices={devices} onNavigate={setCurrentTab} />
          )}
          {currentTab === 'camera' && (
            <CameraPage esp1={esp1} />
          )}
          {currentTab === 'robot' && (
            <RobotPage esp1={esp1} />
          )}
          {currentTab === 'sensors' && (
            <SensorsPage currentTelemetry={telemetry} />
          )}
          {currentTab === 'moisture' && (
            <MoisturePage telemetry={telemetry} />
          )}
          {currentTab === 'automation' && (
            <AutomationPage />
          )}
          {currentTab === 'predictions' && (
            <PredictionsPage />
          )}
          {currentTab === 'history' && (
            <HistoryPage />
          )}
          {currentTab === 'devices' && (
            <DevicesPage devices={devices} />
          )}
          {currentTab === 'diagnostics' && (
            <DiagnosticsPage onRunHealthCheck={handleRunHealthCheck} />
          )}
          {currentTab === 'settings' && (
            <SettingsPage theme={theme} onToggleTheme={handleToggleTheme} simulationMode={simulationMode} />
          )}
        </main>
      </div>

      {/* Mobile Touch Navigation */}
      <MobileNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* One-Click Health Check Modal */}
      {healthOpen && (
        <HealthModal
          report={healthReport}
          loading={healthLoading}
          onClose={() => setHealthOpen(false)}
        />
      )}
    </div>
  );
};

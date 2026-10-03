import React, { useState, useEffect } from 'react';
import { Terminal, Download, Trash2, RefreshCw, Filter, Search, ShieldCheck } from 'lucide-react';
import { SystemEvent } from '../types';
import { api } from '../services/api';

interface DiagnosticsPageProps {
  onRunHealthCheck: () => void;
}

export const DiagnosticsPage: React.FC<DiagnosticsPageProps> = ({ onRunHealthCheck }) => {
  const [logs, setLogs] = useState<SystemEvent[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getLogs(150);
      setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear system event history?')) {
      await api.clearLogs();
      loadLogs();
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `system_logs_${Date.now()}.json`);
    a.click();
  };

  const filteredLogs = logs.filter(log => {
    const matchesSev = severityFilter === 'all' || log.severity === severityFilter;
    const matchesQuery = searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.device.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesQuery;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Terminal size={22} color="var(--accent)" />
              <span>System Event Logs & Real-Time Diagnostics</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Structured telemetry timeline, watchdog events, network heartbeats, and fault traces
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={onRunHealthCheck}>
              <ShieldCheck size={14} color="var(--accent)" />
              <span>Full Health Check</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} />
              <span>Export JSON</span>
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClear}>
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search message or device..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.2rem' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['all', 'info', 'warning', 'critical'].map(sev => (
              <button
                key={sev}
                className={`btn btn-sm ${severityFilter === sev ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Feed Card */}
      <div className="card" style={{ padding: '0.5rem' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No logs match the selected filter.
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>TIME</th>
                  <th style={{ padding: '0.75rem 1rem' }}>DEVICE</th>
                  <th style={{ padding: '0.75rem 1rem' }}>LEVEL</th>
                  <th style={{ padding: '0.75rem 1rem' }}>MESSAGE</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                      {l.device}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span className={`badge ${
                        l.severity === 'critical' ? 'badge-offline' :
                        l.severity === 'warning' ? 'badge-warning' : 'badge-online'
                      }`}>
                        {l.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {l.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

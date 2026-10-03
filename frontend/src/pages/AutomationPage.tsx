import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Power, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { AutomationRule } from '../types';
import { api } from '../services/api';

export const AutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [showAdd, setShowAdd] = useState<boolean>(false);

  // New Rule Form
  const [name, setName] = useState<string>('');
  const [conditionType, setConditionType] = useState<any>('soil_moisture_below');
  const [threshold, setThreshold] = useState<number>(30);
  const [actionType, setActionType] = useState<any>('deploy_and_water');
  const [durationSeconds, setDurationSeconds] = useState<number>(4);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(300);

  const loadRules = async () => {
    try {
      const res = await api.getRules();
      setRules(res.rules);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggle = async (rule: AutomationRule) => {
    const updated = { ...rule, enabled: !rule.enabled };
    await api.saveRule(updated);
    loadRules();
  };

  const handleDelete = async (id: string) => {
    await api.deleteRule(id);
    loadRules();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await api.saveRule({
      name,
      conditionType,
      threshold,
      actionType,
      durationSeconds,
      cooldownSeconds,
      enabled: true
    });
    setName('');
    setShowAdd(false);
    loadRules();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Cpu size={22} color="var(--accent)" />
              <span>Autonomous Decision & Safety Rules Engine</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Condition-based triggers with hardware safety overrides, maximum runtimes, and mandatory cooldowns
            </p>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            <span>Add New Rule</span>
          </button>
        </div>

        {/* Safety Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem 1rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <ShieldCheck size={20} color="var(--success)" />
          <span>
            <b>Hardware Interlock Armed:</b> All automated irrigation triggers are subject to the hard-coded 10-second pump cutoff and 30-second cooldown timer. No automation rule can override firmware safety limits.
          </span>
        </div>
      </div>

      {/* Add Rule Form Modal / Inline */}
      {showAdd && (
        <form className="card" onSubmit={handleCreate}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Create Automation Rule</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Tomato Bed Morning Irrigation"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>IF Sensor Condition</label>
              <select
                value={conditionType}
                onChange={e => setConditionType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="soil_moisture_below">Soil Moisture Below (%)</option>
                <option value="temp_above">Temperature Above (°C)</option>
                <option value="humidity_below">Humidity Below (%)</option>
                <option value="mq132_above">Air Quality Index Above</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Threshold Value</label>
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>THEN Action</label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="deploy_and_water">Deploy Arm & Pulse Water Pump</option>
                <option value="trigger_alert">Broadcast Warning & Notification</option>
                <option value="retract_soil">Retract Mechanical Soil Arm</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Pulse Duration (Seconds)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Cooldown Period (Seconds)</label>
              <input
                type="number"
                min="30"
                value={cooldownSeconds}
                onChange={e => setCooldownSeconds(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Automation Rule</button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rules.map(rule => (
          <div key={rule.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className={`status-dot ${rule.enabled ? 'dot-green' : 'dot-red'}`} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rule.name}</h4>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                <b>IF</b> {rule.conditionType.replace(/_/g, ' ')} <b>{rule.threshold}</b> → <b>THEN</b> {rule.actionType.replace(/_/g, ' ')}
                {rule.actionType === 'deploy_and_water' && ` (${rule.durationSeconds}s runtime)`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> Cooldown: {rule.cooldownSeconds}s
                </span>
                <span>•</span>
                <span>
                  Last Triggered: {rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                className={`btn btn-sm ${rule.enabled ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleToggle(rule)}
              >
                <Power size={14} />
                <span>{rule.enabled ? 'Active' : 'Disabled'}</span>
              </button>

              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(rule.id)}
                title="Delete rule"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

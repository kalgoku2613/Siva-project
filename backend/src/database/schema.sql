-- ESP Smart Control Database Schema

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  ip TEXT NOT NULL,
  rssi INTEGER,
  uptime_seconds INTEGER,
  free_heap INTEGER,
  firmware TEXT,
  last_seen INTEGER NOT NULL,
  latency_ms INTEGER
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  temperature REAL,
  humidity REAL,
  dht_valid INTEGER,
  mq132_raw INTEGER,
  mq132_index REAL,
  mq132_warmed_up INTEGER,
  mq5_raw INTEGER,
  mq5_index REAL,
  mq5_warmed_up INTEGER,
  soil_raw INTEGER,
  soil_percent INTEGER,
  soil_state TEXT,
  soil_active INTEGER,
  sequence_state TEXT,
  servo_angle INTEGER,
  pump_active INTEGER,
  pump_elapsed_ms INTEGER,
  is_simulated INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);

CREATE TABLE IF NOT EXISTS motor_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  direction TEXT NOT NULL,
  speed INTEGER NOT NULL,
  source TEXT DEFAULT 'web'
);

CREATE TABLE IF NOT EXISTS pump_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'ON', 'OFF', 'EMERGENCY_STOP', 'AUTO_CUTOFF'
  duration_ms INTEGER,
  source TEXT DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS servo_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'DEPLOY', 'RETRACT', 'SET_ANGLE'
  target_angle INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moisture_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  soil_raw INTEGER NOT NULL,
  soil_percent INTEGER NOT NULL,
  state TEXT NOT NULL,
  sequence_duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS system_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  device TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp);

CREATE TABLE IF NOT EXISTS ml_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  target TEXT NOT NULL,
  horizon_minutes INTEGER NOT NULL,
  predicted_value REAL NOT NULL,
  confidence_lower REAL NOT NULL,
  confidence_upper REAL NOT NULL,
  confidence_level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  condition_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  action_type TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  cooldown_seconds INTEGER NOT NULL,
  last_triggered INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

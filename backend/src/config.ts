import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or backend folder
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/esp_control.sqlite'),

  // ESP Device Addresses
  WIFI_SSID: process.env.WIFI_SSID || '',
  WIFI_PASSWORD: process.env.WIFI_PASSWORD || '',
  ESP1_IP: process.env.ESP1_IP || '192.168.1.150',
  ESP2_IP: process.env.ESP2_IP || '192.168.1.151',

  // Hardware Safety Limits
  MAX_PUMP_RUNTIME_SECONDS: parseInt(process.env.MAX_PUMP_RUNTIME_SECONDS || '10', 10),
  PUMP_COOLDOWN_SECONDS: parseInt(process.env.PUMP_COOLDOWN_SECONDS || '30', 10),
  MOTOR_TIMEOUT_MS: parseInt(process.env.MOTOR_TIMEOUT_MS || '1500', 10),
  HEARTBEAT_TIMEOUT_SECONDS: parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS || '10', 10),

  // Simulation Mode toggle (disabled by default; set SIMULATION_MODE=true in .env to test without ESP32)
  SIMULATION_MODE: process.env.SIMULATION_MODE === 'true',

  // Optional API Secret
  API_SECRET_KEY: process.env.API_SECRET_KEY || ''
};

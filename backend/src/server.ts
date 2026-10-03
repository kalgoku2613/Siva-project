import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { CONFIG } from './config';
import { dbManager } from './database/db';
import { apiRouter } from './routes/api';
import { DeviceManager } from './services/deviceManager';
import { SafetyWatchdog } from './services/safetyWatchdog';
import { AutomationEngine } from './services/automationEngine';
import { MLService } from './services/mlService';
import { SupabaseBridge } from './services/supabaseBridge';
import { WebSocketMessage } from './types';

async function bootstrap() {
  console.log('========================================================');
  console.log('  ESP Smart Control - Local Hub & Backend Server');
  console.log('========================================================');

  // 1. Initialize SQLite Database
  await dbManager.init();

  // 2. Initialize Automation Engine & Seed Rules
  await AutomationEngine.init();

  // 3. Initial ML Models Training Check
  await MLService.trainModels();

  // 4. Initialize Optional Supabase Cloud Bridge
  SupabaseBridge.init();

  // 4. Setup Express Application
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for diagnostic tracing
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.url.includes('/status')) {
      // console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Global Express error handler to prevent unhandled 500 HTML responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
    }
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
  });

  // Health root
  app.get('/', (req, res) => {
    res.json({
      name: 'ESP Smart Control Local Backend',
      version: '1.2.0',
      status: 'RUNNING',
      simulationMode: CONFIG.SIMULATION_MODE,
      wsEndpoint: `ws://${req.headers.host}`
    });
  });

  // 5. Create HTTP Server
  const server = http.createServer(app);

  // 6. Setup WebSocket Server
  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    // Send immediate state sync
    const telemetry = DeviceManager.getLatestTelemetry();
    const devices = DeviceManager.getDevices();
    if (telemetry) {
      const initMsg: WebSocketMessage = {
        type: 'telemetry',
        payload: { telemetry, devices },
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(initMsg));
    }

    ws.on('message', async (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'robot_move') {
          await DeviceManager.sendMotorCommand(msg.direction, msg.speed);
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('[WS] Parse message error:', err);
      }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  // 7. Wire DeviceManager updates to WebSockets & Safety Engine
  DeviceManager.onUpdate(async ({ telemetry, devices }) => {
    // Check safety timeouts
    if (SafetyWatchdog.isPumpOvertime()) {
      console.warn('[WATCHDOG] Safety cutoff: Water pump exceeded maximum allowed runtime!');
      await DeviceManager.setPump(false, 0, 'safety_cutoff');
    }

    if (SafetyWatchdog.isMotorTimedOut()) {
      await DeviceManager.sendMotorCommand('STOP', 0);
    }

    // Evaluate automation rules if sensor reading is available
    if (telemetry) {
      await AutomationEngine.evaluate(telemetry);
    }

    // Broadcast over WebSocket to all active frontend clients
    const payload: WebSocketMessage = {
      type: 'telemetry',
      payload: { telemetry, devices },
      timestamp: Date.now()
    };
    const serialized = JSON.stringify(payload);

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      }
    }
  });

  // 8. Start Hardware & Simulation Polling Loop
  await DeviceManager.init();

  // 9. Listen on Port
  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`[SERVER] Backend server listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`[SERVER] WebSocket service active on ws://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`[SERVER] Simulation Mode: ${CONFIG.SIMULATION_MODE ? 'ENABLED (Virtual ESPs)' : 'DISABLED (Real Hardware)'}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[SERVER] Shutting down gracefully...');
    SafetyWatchdog.emergencyStopAll();
    dbManager.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});

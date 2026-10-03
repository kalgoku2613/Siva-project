import path from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';

async function generate() {
  console.log('[SYNTHETIC] Generating correlated 7-day historical dataset for ML & analytics...');

  const dbDir = path.resolve(__dirname, '../backend/data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.resolve(dbDir, 'esp_control.sqlite');

  const SQL = await initSqlJs();
  let db: any;

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
    const schemaPath = path.resolve(__dirname, '../backend/src/database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      db.run(fs.readFileSync(schemaPath, 'utf8'));
    }
  }

  const now = Date.now();
  const totalDays = 7;
  const intervalMinutes = 15;
  const totalPoints = (totalDays * 24 * 60) / intervalMinutes; // ~672 points

  let soil = 65.0; // starts wet
  let lastWaterTime = now - (totalDays * 24 * 3600 * 1000);

  const insertStmt = db.prepare(`
    INSERT INTO sensor_readings (
      timestamp, temperature, humidity, dht_valid,
      mq132_raw, mq132_index, mq132_warmed_up,
      mq5_raw, mq5_index, mq5_warmed_up,
      soil_raw, soil_percent, soil_state, soil_active,
      sequence_state, servo_angle, pump_active, pump_elapsed_ms, is_simulated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = totalPoints; i >= 0; i--) {
    const timestamp = now - (i * intervalMinutes * 60 * 1000);
    const date = new Date(timestamp);
    const hour = date.getHours() + (date.getMinutes() / 60);

    // Diurnal temperature cycle: peak around 14:00 (2 PM), low around 05:00 (5 AM)
    const diurnalAngle = ((hour - 5) / 24) * 2 * Math.PI;
    const baseTemp = 24.0 + (Math.sin(diurnalAngle - Math.PI / 2) * 6.5);
    const tempNoise = (Math.random() * 0.6) - 0.3;
    const temperature = parseFloat((baseTemp + tempNoise).toFixed(1));

    // Humidity negatively correlated with temperature (higher at night, lower at midday)
    const baseHum = 75.0 - (Math.sin(diurnalAngle - Math.PI / 2) * 25.0);
    const humNoise = (Math.random() * 1.5) - 0.75;
    const humidity = parseFloat(Math.max(25, Math.min(95, baseHum + humNoise)).toFixed(1));

    // Gas sensor baselines with slight daytime elevation (traffic / activity)
    const gasBase = hour >= 8 && hour <= 20 ? 980 : 820;
    const mq132Raw = Math.floor(gasBase + (Math.random() * 100) - 50);
    const mq132Index = parseFloat(((mq132Raw / 4095) * 100).toFixed(1));

    const mq5Raw = Math.floor(650 + (Math.random() * 80) - 40);
    const mq5Index = parseFloat(((mq5Raw / 4095) * 100).toFixed(1));

    // Soil moisture: slowly evaporates (~0.35% per 15 min during hot day, ~0.15% at night)
    const evapRate = (temperature / 24.0) * 0.25;
    soil = Math.max(15.0, soil - evapRate);

    // Watering event: If soil drops below 30%, irrigation triggers!
    let pumpActive = 0;
    let pumpElapsed = 0;
    if (soil < 30.0) {
      soil = Math.min(85.0, soil + 45.0); // sharp increase after irrigation
      pumpActive = 1;
      pumpElapsed = 4000;
      lastWaterTime = timestamp;
    }

    const soilPct = Math.round(soil);
    const soilState = soilPct < 35 ? 'DRY' : soilPct <= 70 ? 'MODERATE' : 'WET';
    const soilRaw = Math.round(3200 - ((soilPct / 100) * (3200 - 1350)));

    insertStmt.run([
      timestamp,
      temperature,
      humidity,
      1,
      mq132Raw,
      mq132Index,
      1,
      mq5Raw,
      mq5Index,
      1,
      soilRaw,
      soilPct,
      soilState,
      1,
      'MEASUREMENT_READY',
      0,
      pumpActive,
      pumpElapsed,
      1 // is_simulated
    ]);
  }

  insertStmt.free();

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log(`[SYNTHETIC] Successfully generated and stored ${totalPoints} correlated historical data records!`);
}

generate().catch(console.error);

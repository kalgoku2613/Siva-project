#ifndef WEB_DEBUG_ESP1_H
#define WEB_DEBUG_ESP1_H

#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <esp_http_server.h>
#include "config.h"
#include "motor_controller.h"

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

static unsigned long stream_frame_count = 0;
static float stream_current_fps = 0.0;
static unsigned long stream_fps_timer = 0;

// Embedded HTML5 Debug Webpage for ESP1
static const char PROGMEM INDEX_HTML[] = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP1: Camera & Motor Debug</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #64748b;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --border: #e2e8f0;
      --danger: #ef4444;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 1.5rem; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    .badge { background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: var(--text); font-weight: 600; display: flex; justify-content: space-between; }
    .stream-box { width: 100%; height: 260px; background: #000; border-radius: 0.75rem; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .stream-box img { width: 100%; height: 100%; object-fit: contain; }
    .stat-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--sub); }
    .stat-val { font-weight: 500; }
    .dpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-width: 240px; margin: 1rem auto; }
    button { background: var(--card); border: 1px solid var(--border); padding: 0.85rem; border-radius: 0.75rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; color: var(--text); }
    button:active, button:hover { background: #f1f5f9; transform: translateY(-1px); }
    button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    button.primary:hover { background: var(--accent-hover); }
    button.stop { background: #fee2e2; color: var(--danger); border-color: #fca5a5; }
    button.stop:hover { background: #fecaca; }
    .slider-group { margin-top: 1rem; }
    .slider-group label { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--sub); }
    input[type=range] { width: 100%; accent-color: var(--accent); }
    .hud { font-size: 0.8rem; color: var(--sub); margin-top: 0.5rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>ESP1: Camera & Motor Controller</h1>
        <p style="color:var(--sub); font-size:0.85rem;">Local Hardware Debug Server</p>
      </div>
      <span class="badge">● Online (LAN)</span>
    </header>

    <div class="grid">
      <!-- Camera Stream Card -->
      <div class="card">
        <h2>
          <span>Live Camera Preview</span>
          <span style="font-size:0.8rem; font-weight:normal; color:var(--sub);" id="fps-label">FPS: --</span>
        </h2>
        <div class="stream-box">
          <img id="stream" src="/stream" alt="Live Camera Stream" />
        </div>
        <div class="hud">Resolution: SVGA (800x600) | Quality: JPEG</div>
        <div style="margin-top:0.75rem; text-align:center;">
          <a href="/snapshot" target="_blank"><button style="padding:0.4rem 1rem; font-size:0.85rem;">Take Snapshot</button></a>
        </div>
      </div>

      <!-- Motor Controls Card -->
      <div class="card">
        <h2>Motor Control & Direction</h2>
        <div class="dpad">
          <div></div>
          <button class="primary" onclick="cmd('forward')">▲ FWD</button>
          <div></div>
          <button class="primary" onclick="cmd('left')">◀ L</button>
          <button class="stop" onclick="cmd('stop')">■ STOP</button>
          <button class="primary" onclick="cmd('right')">R ▶</button>
          <div></div>
          <button class="primary" onclick="cmd('backward')">▼ REV</button>
          <div></div>
        </div>

        <div class="slider-group">
          <label><span>Motor PWM Speed</span><span id="speed-val">190</span></label>
          <input type="range" min="0" max="255" value="190" id="speed-slider" oninput="updateSpeed(this.value)">
        </div>
        <div class="hud" style="color:var(--danger); font-size:0.75rem;">
          Safety Watchdog: Auto-stops after 1.5s idle
        </div>
      </div>

      <!-- Telemetry Card -->
      <div class="card" style="grid-column: 1 / -1;">
        <h2>Hardware Diagnostics & Health</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
          <div>
            <div class="stat-row"><span class="stat-label">Device Name:</span><span class="stat-val" id="d-name">ESP1-Camera-Motor</span></div>
            <div class="stat-row"><span class="stat-label">Firmware:</span><span class="stat-val" id="d-fw">--</span></div>
            <div class="stat-row"><span class="stat-label">Uptime:</span><span class="stat-val" id="d-uptime">--</span></div>
          </div>
          <div>
            <div class="stat-row"><span class="stat-label">IP Address:</span><span class="stat-val" id="d-ip">--</span></div>
            <div class="stat-row"><span class="stat-label">Wi-Fi RSSI:</span><span class="stat-val" id="d-rssi">--</span></div>
            <div class="stat-row"><span class="stat-label">Free Heap:</span><span class="stat-val" id="d-heap">--</span></div>
          </div>
          <div>
            <div class="stat-row"><span class="stat-label">Motor State:</span><span class="stat-val" id="d-motor">STOP</span></div>
            <div class="stat-row"><span class="stat-label">Current Speed:</span><span class="stat-val" id="d-speed">190</span></div>
            <div class="stat-row"><span class="stat-label">Last Command:</span><span class="stat-val" id="d-last">--</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function cmd(action) {
      try {
        await fetch('/api/motor/' + action, { method: 'POST' });
        pollStatus();
      } catch (e) {
        console.error('Command failed', e);
      }
    }

    async function updateSpeed(val) {
      document.getElementById('speed-val').innerText = val;
      try {
        await fetch('/api/motor/speed?val=' + val, { method: 'POST' });
      } catch (e) {}
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('d-fw').innerText = data.firmware;
        document.getElementById('d-uptime').innerText = data.uptime_seconds + 's';
        document.getElementById('d-ip').innerText = data.ip;
        document.getElementById('d-rssi').innerText = data.rssi + ' dBm';
        document.getElementById('d-heap').innerText = Math.round(data.free_heap / 1024) + ' KB';
        document.getElementById('d-motor').innerText = data.motor_direction;
        document.getElementById('d-speed').innerText = data.motor_speed;
        document.getElementById('d-last').innerText = data.last_command_ms_ago + 'ms ago';
      } catch (e) {}
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'w' || e.key === 'ArrowUp') cmd('forward');
      else if (e.key === 's' || e.key === 'ArrowDown') cmd('backward');
      else if (e.key === 'a' || e.key === 'ArrowLeft') cmd('left');
      else if (e.key === 'd' || e.key === 'ArrowRight') cmd('right');
      else if (e.key === ' ' || e.key === 'Escape') cmd('stop');
    });

    setInterval(pollStatus, 1500);
    pollStatus();
  </script>
</body>
</html>
)rawliteral";

// Handler for HTML root
static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, INDEX_HTML, strlen(INDEX_HTML));
}

// Handler for MJPEG stream
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t *_jpg_buf = NULL;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "X-Framerate", "15");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      vTaskDelay(pdMS_TO_TICKS(10));
      continue;
    }

    if (fb->format != PIXFORMAT_JPEG) {
      bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
      esp_camera_fb_return(fb);
      fb = NULL;
      if (!jpeg_converted) {
        res = ESP_FAIL;
        break;
      }
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }

    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if (_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }

    if (res != ESP_OK) {
      break;
    }

    // Keep motor watchdog alive while camera client is active and moving
    motors.pingWatchdog();
    vTaskDelay(pdMS_TO_TICKS(30)); // Limit to ~25-30 FPS
  }

  return res;
}

// Handler for snapshot
static esp_err_t snapshot_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=snapshot.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

// Handler for /api/status
static esp_err_t status_handler(httpd_req_t *req) {
  char json_buf[384];
  snprintf(json_buf, sizeof(json_buf),
    "{\"device\":\"%s\",\"firmware\":\"%s\",\"uptime_seconds\":%lu,\"ip\":\"%s\",\"rssi\":%d,\"free_heap\":%u,\"motor_direction\":\"%s\",\"motor_speed\":%u,\"last_command_ms_ago\":%lu,\"camera_online\":true}",
    DEVICE_NAME,
    FIRMWARE_VERSION,
    millis() / 1000,
    WiFi.localIP().toString().c_str(),
    WiFi.RSSI(),
    ESP.getFreeHeap(),
    motors.getDirectionString(),
    motors.getSpeed(),
    motors.getLastCommandElapsed()
  );

  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json_buf, strlen(json_buf));
}

// Motor command handlers
static esp_err_t motor_cmd_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "application/json");

  const char *uri = req->uri;
  if (strstr(uri, "forward")) {
    motors.forward();
  } else if (strstr(uri, "backward")) {
    motors.backward();
  } else if (strstr(uri, "left")) {
    motors.turnLeft();
  } else if (strstr(uri, "right")) {
    motors.turnRight();
  } else if (strstr(uri, "stop")) {
    motors.stop();
  }

  char res[96];
  snprintf(res, sizeof(res), "{\"success\":true,\"direction\":\"%s\"}", motors.getDirectionString());
  return httpd_resp_send(req, res, strlen(res));
}

static esp_err_t motor_speed_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "application/json");

  char query[32] = {0};
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) == ESP_OK) {
    char param[8] = {0};
    if (httpd_query_key_value(query, "val", param, sizeof(param)) == ESP_OK) {
      int val = atoi(param);
      if (val >= 0 && val <= 255) {
        motors.setSpeed((uint8_t)val);
      }
    }
  }

  char res[64];
  snprintf(res, sizeof(res), "{\"success\":true,\"speed\":%u}", motors.getSpeed());
  return httpd_resp_send(req, res, strlen(res));
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port = 32768;

  httpd_uri_t index_uri = { .uri = "/", .method = HTTP_GET, .handler = index_handler, .user_ctx = NULL };
  httpd_uri_t status_uri = { .uri = "/api/status", .method = HTTP_GET, .handler = status_handler, .user_ctx = NULL };
  httpd_uri_t snap_uri = { .uri = "/snapshot", .method = HTTP_GET, .handler = snapshot_handler, .user_ctx = NULL };
  httpd_uri_t fwd_uri = { .uri = "/api/motor/forward", .method = HTTP_POST, .handler = motor_cmd_handler, .user_ctx = NULL };
  httpd_uri_t bwd_uri = { .uri = "/api/motor/backward", .method = HTTP_POST, .handler = motor_cmd_handler, .user_ctx = NULL };
  httpd_uri_t lft_uri = { .uri = "/api/motor/left", .method = HTTP_POST, .handler = motor_cmd_handler, .user_ctx = NULL };
  httpd_uri_t rgt_uri = { .uri = "/api/motor/right", .method = HTTP_POST, .handler = motor_cmd_handler, .user_ctx = NULL };
  httpd_uri_t stp_uri = { .uri = "/api/motor/stop", .method = HTTP_POST, .handler = motor_cmd_handler, .user_ctx = NULL };
  httpd_uri_t spd_uri = { .uri = "/api/motor/speed", .method = HTTP_POST, .handler = motor_speed_handler, .user_ctx = NULL };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &status_uri);
    httpd_register_uri_handler(camera_httpd, &snap_uri);
    httpd_register_uri_handler(camera_httpd, &fwd_uri);
    httpd_register_uri_handler(camera_httpd, &bwd_uri);
    httpd_register_uri_handler(camera_httpd, &lft_uri);
    httpd_register_uri_handler(camera_httpd, &rgt_uri);
    httpd_register_uri_handler(camera_httpd, &stp_uri);
    httpd_register_uri_handler(camera_httpd, &spd_uri);
  }

  // Stream on dedicated handler or port
  config.server_port = 81;
  config.ctrl_port = 32769;
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}

#endif // WEB_DEBUG_ESP1_H

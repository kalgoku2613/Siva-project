# Hosting on Vercel & Supabase for Worldwide Mobile Remote Control

This guide explains how to host your **ESP Smart Control** web application on **Vercel** (`versal`) and connect it to a free **Supabase** (`super base`) cloud database. This allows you to open your IoT control hub on your mobile phone anywhere (even over cellular 4G/5G) and drive your robot or monitor sensors seamlessly.

---

## 1. How It Works (Cloud Architecture)

```text
 ┌──────────────────────┐         ┌──────────────────────┐
 │     Mobile Phone     │         │   Vercel Cloud Host  │
 │ (Safari / Chrome PWA)│────────►│  React Application   │
 └──────────────────────┘         └──────────┬───────────┘
                                             │
                                  Insert Cloud Command
                                             │
                                  ┌──────────▼───────────┐
                                  │    Supabase Cloud    │
                                  │   Realtime Database  │
                                  │                      │
                                  │ - commands table     │
                                  │ - telemetry table    │
                                  └──────────▲───────────┘
                                             │
                                   Outbound WebSocket
                                             │
                                  ┌──────────▼───────────┐
                                  │ Local Hub / ESP32s   │
                                  │ Inside Home Network  │
                                  │                      │
                                  │ ESP1: Camera + Motors│
                                  │ ESP2: Sensors + Pump │
                                  └──────────────────────┘
```

Because home Wi-Fi routers block incoming connections from the internet (NAT/Firewall), your phone outside the house cannot normally reach `192.168.1.150`.
By using **Supabase Realtime**, the local hub establishes an *outbound* connection to Supabase. When you press **Drive Forward** or **Deploy Soil** on your phone:
1. The Vercel app writes a command to Supabase `commands` table.
2. Supabase pushes the command instantly over WebSocket to your local hub / ESP32.
3. The motors move, sensors read, and live telemetry updates on your phone in real time!

---

## 2. Step-by-Step Setup

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **"New Project"**, name it `esp-smart-control`, and choose your region.
3. Once created, go to the **SQL Editor** on the left menu.
4. Click **"New query"**, paste the entire contents of [`supabase/schema.sql`](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/supabase/schema.sql), and click **"Run"**.
5. This creates the `devices`, `telemetry`, and `commands` tables with Realtime enabled!

### Step 2: Copy API Credentials
1. In Supabase, go to **Project Settings** (gear icon) $\rightarrow$ **API**.
2. Copy two values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon public Key** (e.g. `eyJhbGciOi...`)

### Step 3: Connect Local Backend Hub
In your local project, open `.env` and add:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```
Restart your backend (`npm start` or double-click `start-app.bat`).
The console will print:
```text
[SUPABASE_BRIDGE] Cloud sync initialized. Bridging local ESPs to Supabase Cloud.
```
Your local hub is now actively syncing sensor readings to the cloud and listening for mobile commands!

### Step 4: Deploy Frontend to Vercel
1. Push this repository to your GitHub account (`git push`).
2. Go to [https://vercel.com](https://vercel.com) and sign in.
3. Click **"Add New..."** $\rightarrow$ **"Project"** $\rightarrow$ Import your repository.
4. Set the following in the Vercel deployment form:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `frontend`)
   - **Environment Variables**:
     - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-key`
5. Click **"Deploy"**.
6. Within 1 minute, Vercel gives you a live HTTPS URL like:
   `https://esp-smart-control.vercel.app`

---

## 3. Controlling from Your Mobile Phone

1. Open your Vercel URL on your mobile phone:
   `https://esp-smart-control.vercel.app`
2. Tap **"Install App"** in the top ribbon (or "Add to Home Screen" in Safari / Chrome).
3. Open the **"Robot Driving"** tab:
   - You can drive forward/reverse and steer with your thumbs directly on the phone screen!
4. Open the **"Soil Deployment"** tab:
   - Trigger the mechanical servo arm and precision watering from anywhere.

---

## 4. Camera Video When Outside Home Network
- **When on the same Wi-Fi**: The live camera stream loads directly from the ESP32-CAM local IP (`http://192.168.1.150:81/stream`).
- **When remote over Cellular (4G/5G)**: The ESP32-CAM uploads snapshots to Supabase storage every few seconds, or you can use a lightweight local tunnel (e.g. Cloudflare Tunnel / ngrok) pointing to Port 81.

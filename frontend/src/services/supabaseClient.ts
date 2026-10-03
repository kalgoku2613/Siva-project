// Optional Supabase Cloud Realtime Client for Vercel Remote Control
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseService {
  private config: SupabaseConfig | null = null;
  private ws: WebSocket | null = null;

  constructor() {
    const env = (import.meta as any).env || {};
    const rawUrl = (localStorage.getItem('supabase_url') || env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
    const rawKey = (localStorage.getItem('supabase_key') || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.SUPABASE_SECRET_KEY || '').trim();

    if (rawUrl && rawKey) {
      this.config = { url: rawUrl.replace(/\/+$/, ''), anonKey: rawKey };
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config?.url && this.config?.anonKey);
  }

  public setConfig(url: string, anonKey: string): void {
    if (url && anonKey) {
      this.config = { url, anonKey };
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', anonKey);
    } else {
      this.config = null;
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_key');
    }
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public async sendCommand(action: string, payload: any): Promise<boolean> {
    if (!this.config) return false;

    try {
      const endpoint = `${this.config.url}/rest/v1/commands`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': this.config.anonKey,
          'Authorization': `Bearer ${this.config.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          target: action.startsWith('robot') ? 'ESP1' : 'ESP2',
          action,
          payload,
          executed: false
        })
      });

      return res.ok;
    } catch (err) {
      console.error('[SUPABASE] Failed to push cloud command:', err);
      return false;
    }
  }

  public async fetchLatestTelemetry(): Promise<any | null> {
    if (!this.config) return null;

    try {
      const endpoint = `${this.config.url}/rest/v1/telemetry?order=created_at.desc&limit=1`;
      const res = await fetch(endpoint, {
        headers: {
          'apikey': this.config.anonKey,
          'Authorization': `Bearer ${this.config.anonKey}`
        }
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();

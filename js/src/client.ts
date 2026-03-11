/**
 * PythonMonkey - framework-agnostic WebSocket client.
 *
 * Connects to the Python backend's PythonMonkey WebSocket endpoint
 * and streams log messages to the browser's DevTools console.
 */

import { logToConsole } from './console';

export interface PythonMonkeyOptions {
  /** Full WebSocket URL, e.g. "ws://localhost:8000/ws/python-monkey" */
  url: string;
  /** Set to false to disable entirely (no-op). Defaults to true. */
  enabled?: boolean;
  /** Delay in ms before reconnecting after a disconnect. Defaults to 3000. */
  reconnectDelay?: number;
  /** Interval in ms for WebSocket keepalive pings. Defaults to 30000. */
  pingInterval?: number;
}

export class PythonMonkey {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private readonly url: string;
  private readonly enabled: boolean;
  private readonly reconnectDelay: number;
  private readonly pingInterval: number;

  constructor(options: PythonMonkeyOptions) {
    this.url = options.url;
    this.enabled = options.enabled ?? true;
    this.reconnectDelay = options.reconnectDelay ?? 3000;
    this.pingInterval = options.pingInterval ?? 30000;
  }

  connect(): void {
    if (!this.enabled) return;
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;

    this.isConnecting = true;

    try {
      console.log('[PythonMonkey] Connecting to backend...', this.url);
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.isConnecting = false;
        console.log(
          '[PythonMonkey] Connected - Python logs will appear in this console',
        );

        this.pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, this.pingInterval);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;
          logToConsole(data);
        } catch (e) {
          console.error('[PythonMonkey] Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        this.isConnecting = false;
        console.warn('[PythonMonkey] WebSocket error:', error);
      };

      ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;
        this.clearPing();

        if (event.code === 1008) {
          console.log('[PythonMonkey] Disabled by server (production mode)');
          return;
        }

        console.log(
          '[PythonMonkey] Disconnected, reconnecting in',
          this.reconnectDelay,
          'ms...',
        );
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      };
    } catch (e) {
      this.isConnecting = false;
      console.error('[PythonMonkey] Failed to connect:', e);
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.clearPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

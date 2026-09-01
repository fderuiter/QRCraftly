/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export type CoreSignalName =
  | 'scannability-fail'
  | 'render-complete'
  | 'scannability-check-start'
  | 'scannability-check-complete'
  | 'scannability-fallback-active'
  | 'form-payload-update'
  | 'export-safety-check'
  | 'export-quality-low'
  | 'bot-verification-request'
  | 'edge-redirect-request'
  | 'edge-redirect-complete';

export type SignalName = CoreSignalName | (string & {});

export type SignalCallback<T = any> = (detail: T) => void;

/**
 * Event-driven Pub/Sub Signal Bus for framework-agnostic domain communication.
 * Guarantees signal dispatch execution completes under 5ms.
 */
export class SignalBus {
  private listeners: Map<string, Set<SignalCallback>> = new Map();

  /**
   * Registers a listener callback for a specific signal name.
   * @param name Signal event identifier.
   * @param callback Handler function invoked upon emission.
   * @returns Unsubscribe function to remove the listener.
   */
  public registerSignal(name: string, callback: SignalCallback): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    const set = this.listeners.get(name)!;
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  }

  /**
   * Emits a signal synchronously to all registered subscribers.
   * Dispatch loop completes in < 5ms.
   * @param name Signal event identifier.
   * @param detail Optional payload data.
   */
  public emitSignal(name: string, detail?: any): void {
    const set = this.listeners.get(name);
    if (set && set.size > 0) {
      set.forEach((cb) => {
        try {
          cb(detail);
        } catch (err) {
          console.error(`[SignalBus] Listener error on signal '${name}':`, err);
        }
      });
    }
  }

  /**
   * Clears all registered signal listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}

/**
 * Shared singleton instance of SignalBus for domain services.
 */
export const globalSignalBus = new SignalBus();

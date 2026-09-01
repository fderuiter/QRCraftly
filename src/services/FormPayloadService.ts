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

import { QRType } from '../types';
import { INPUT_REGISTRY } from '../components/inputs/InputRegistry';
import { isDangerousUrl } from '../utils/security';
import { ValidationEngine } from '../engine/ValidationEngine';
import { SignalBus, globalSignalBus } from './SignalBus';

export interface FormValidationResult {
  isValid: boolean;
  violations: string[];
}

export interface ProcessPayloadResult extends FormValidationResult {
  sanitizedData: any;
  serializedValue: string;
}

/**
 * Pure framework-agnostic domain service for form payload containment validation,
 * normalization, and serialization outside component render flows.
 */
export class FormPayloadService {
  private bus: SignalBus;

  constructor(bus: SignalBus = globalSignalBus) {
    this.bus = bus;
  }

  /**
   * Validates structured input data against security containment profiles and dangerous scheme checks.
   * @param type QR code category type.
   * @param data Form field data structure.
   */
  public validateContainment(type: QRType, data: any): FormValidationResult {
    const violations: string[] = [];

    if (!data) {
      return { isValid: true, violations: [] };
    }

    if (type === QRType.WIFI) {
      if (data.ssid && ValidationEngine.CONTAINMENT_PROFILES.STRICT_NO_CONTROL.test(data.ssid)) {
        violations.push('SSID contains invalid control characters');
      }
      if (data.password && ValidationEngine.CONTAINMENT_PROFILES.STRICT_NO_CONTROL.test(data.password)) {
        violations.push('Password contains invalid control characters');
      }
      if (data.eapIdentity && ValidationEngine.CONTAINMENT_PROFILES.STRICT_NO_CONTROL.test(data.eapIdentity)) {
        violations.push('EAP Identity contains invalid control characters');
      }
    } else if (type === QRType.VCARD) {
      if (data.website && isDangerousUrl(data.website)) {
        violations.push('Website contains a dangerous URL protocol');
      }
    } else if (type === QRType.PAYMENT) {
      if (data.address && isDangerousUrl(data.address)) {
        violations.push('Payment address contains a dangerous URL protocol');
      }
    } else if (type === QRType.URL) {
      if (data.url && isDangerousUrl(data.url)) {
        violations.push('Target URL contains a dangerous URL protocol');
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Serializes typed input data into a raw QR string payload using the input registry construct function.
   * @param type QR code category type.
   * @param data Form field data structure.
   */
  public serializePayload(type: QRType, data: any): string {
    const entry = INPUT_REGISTRY[type];
    if (!entry || !entry.constructFn) {
      return '';
    }
    try {
      return entry.constructFn(data as never);
    } catch (err) {
      console.error(`[FormPayloadService] Failed to serialize payload for ${type}:`, err);
      return '';
    }
  }

  /**
   * Processes a form field update: merges updates, validates containment, serializes payload,
   * and emits a form update signal on the signal bus.
   * @param type QR code category type.
   * @param currentData Current field data.
   * @param updates Field updates to apply.
   */
  public processFieldUpdate(type: QRType, currentData: any, updates: any): ProcessPayloadResult {
    const sanitizedData = { ...currentData, ...updates };
    const { isValid, violations } = this.validateContainment(type, sanitizedData);
    let serializedValue = '';

    if (isValid) {
      serializedValue = this.serializePayload(type, sanitizedData);
    }

    const result: ProcessPayloadResult = {
      sanitizedData,
      serializedValue,
      isValid,
      violations,
    };

    this.bus.emitSignal('form-payload-update', {
      type,
      ...result,
    });

    return result;
  }
}

export const formPayloadService = new FormPayloadService();

import React, { useEffect, useId, useState } from 'react';
import { Flashlight, FlashlightOff, SwitchCamera } from 'lucide-react';
import type { CameraDevice, CameraInfo } from '@/packages/optical-scanner/client';
import { Button } from './ui/Button';
import { RangeInput } from './ui/RangeInput';
import { SelectField } from './ui/FormFields';

/** Whether the main pointer is a finger (phones and tablets), where a flip button beats a list. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return coarse;
}

export interface ScannerCameraControlsProps {
  /** The streaming camera and what it supports. */
  camera: CameraInfo;
  /** Cameras the user can switch to. */
  cameras: CameraDevice[];
  /** Switches to another camera. */
  onSwitchCamera: (deviceId: string) => void;
  /** Turns the torch on or off. */
  onTorch: (on: boolean) => void;
  /** Sets the zoom. */
  onZoom: (value: number) => void;
}

/**
 * Camera controls under the scanner's viewfinder (#1100). Each one appears only when the camera
 * supports it: a camera switch when there is more than one camera (a flip button on touch screens,
 * a list elsewhere), the torch, and zoom.
 * @param props - Component properties.
 * @returns The controls, or nothing when the camera offers none.
 */
export const ScannerCameraControls: React.FC<ScannerCameraControlsProps> = ({
  camera,
  cameras,
  onSwitchCamera,
  onTorch,
  onZoom,
}) => {
  const coarse = useCoarsePointer();
  const zoomId = useId();
  const canSwitch = cameras.length > 1;
  if (!canSwitch && !camera.torch.supported && !camera.zoom) return null;

  const current = cameras.findIndex((device) => device.deviceId === camera.deviceId);
  const nextCamera = cameras[(current + 1) % cameras.length];
  const zoom = camera.zoom;

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-line-subtle bg-surface-sunken p-3">
      {canSwitch &&
        (coarse ? (
          <Button variant="secondary" size="sm" onClick={() => onSwitchCamera(nextCamera.deviceId)}>
            <SwitchCamera className="size-4" aria-hidden="true" />
            Switch camera
          </Button>
        ) : (
          <SelectField
            label="Camera"
            className="min-w-48 flex-1"
            value={camera.deviceId ?? ''}
            onChange={(event) => onSwitchCamera(event.target.value)}
          >
            {current === -1 && <option value="">Current camera</option>}
            {cameras.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </SelectField>
        ))}
      {camera.torch.supported && (
        <Button variant="secondary" size="sm" pressed={camera.torch.on} onClick={() => onTorch(!camera.torch.on)}>
          {camera.torch.on ? (
            <Flashlight className="size-4" aria-hidden="true" />
          ) : (
            <FlashlightOff className="size-4" aria-hidden="true" />
          )}
          Torch
        </Button>
      )}
      {zoom && (
        <div className="min-w-40 flex-1">
          <RangeInput
            id={zoomId}
            label="Zoom"
            value={zoom.value}
            min={zoom.min}
            max={zoom.max}
            step={zoom.step}
            onChange={onZoom}
            formatValue={(value) => `${value.toFixed(1)}×`}
          />
        </div>
      )}
    </div>
  );
};

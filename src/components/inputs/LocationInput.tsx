import React, { useState } from 'react';
import { LocationData } from '../../types';
import { TextField } from './FormFields';

interface LocationInputProps {
  data: LocationData;
  onChange: (updates: Partial<LocationData>) => void;
}

/** Human-readable messages for GeolocationPositionError codes. */
const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: 'Location access denied. Please allow location permission in your browser.',
  2: 'Location unavailable. Your device could not determine its position.',
  3: 'Location request timed out. Please try again.',
};

export const LocationInput: React.FC<LocationInputProps> = ({ data, onChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLoading(false);
        setGeoError(null);
        onChange({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        });
      },
      (err) => {
        setIsLoading(false);
        setGeoError(
          GEOLOCATION_ERROR_MESSAGES[err.code] ??
            'An unknown error occurred while fetching location.'
        );
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Geo-Location</h3>
      <TextField
        id="location-latitude"
        label="Latitude"
        type="text"
        inputMode="decimal"
        placeholder="-90 to 90 (e.g. 40.7128)"
        maxLength={20}
        value={data.latitude}
        onChange={(e) => onChange({ latitude: e.target.value })}
        fieldSize="xs"
      />
      <TextField
        id="location-longitude"
        label="Longitude"
        type="text"
        inputMode="decimal"
        placeholder="-180 to 180 (e.g. -74.0060)"
        maxLength={21}
        // Longitude has one extra character vs latitude because it has 3 integer digits
        // (-180) versus latitude's 2 (-90), requiring one more character for the sign+digits.
        value={data.longitude}
        onChange={(e) => onChange({ longitude: e.target.value })}
        fieldSize="xs"
      />
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isLoading}
        aria-busy={isLoading}
        className="w-full px-3 py-2 text-xs font-medium text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Fetching location…' : 'Use Current Location'}
      </button>
      {geoError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {geoError}
        </p>
      )}
    </div>
  );
};

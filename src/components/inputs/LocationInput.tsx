import React, { useState } from "react";
import { Button } from "../ui/Button";
import { LocationData } from "../../types";
import { TextField } from "../ui/FormFields";

/**
 *
 */
interface LocationInputProps {
  /**
   *
   */
  data: LocationData;
  /**
   *
   */
  onChange: (updates: Partial<LocationData>) => void;
}

/** Human-readable messages for GeolocationPositionError codes. */
const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access denied. Please allow location permission in your browser.",
  2: "Location unavailable. Your device could not determine its position.",
  3: "Location request timed out. Please try again.",
};

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
export const LocationInput: React.FC<LocationInputProps> = ({
  data,
  onChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
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
            "An unknown error occurred while fetching location.",
        );
      },
      { timeout: 10000 },
    );
  };

  return (
    <fieldset className="space-y-4 min-w-0">
      <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3">
        Geo-Location
      </legend>
      <TextField
        id="location-latitude"
        label="Latitude"
        type="text"
        inputMode="decimal"
        placeholder="-90 to 90 (e.g. 40.7128)"
        maxLength={20}
        value={data.latitude}
        onChange={(e) => onChange({ latitude: e.target.value })}
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
      />
      <Button
        type="button"
        variant="secondary"
        onClick={handleGetCurrentLocation}
        disabled={isLoading}
        aria-busy={isLoading}
        className="w-full text-xs"
        data-testid="use-current-location"
      >
        {isLoading ? "Fetching location…" : "Use Current Location"}
      </Button>
      {geoError && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
          {geoError}
        </p>
      )}
    </fieldset>
  );
};

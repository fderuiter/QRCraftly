import React, { useMemo } from "react";
import { MeetingData } from "../../types";
import { TextField } from "../ui/FormFields";
import { parseMeetingUrl } from "../../utils/meetingParsers";
import { FIELDSET_CLASSES, LEGEND_CLASSES } from "../ui/styles";

/**
 *
 */
interface MeetingInputProps {
  /**
   *
   */
  data: MeetingData;
  /**
   *
   */
  onChange: (updates: Partial<MeetingData>) => void;
}

const SERVICE_LABELS: Record<string, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  meet: "Google Meet",
};

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.onChange
 */
export const MeetingInput: React.FC<MeetingInputProps> = ({
  data,
  onChange,
}) => {
  const parsed = useMemo(() => parseMeetingUrl(data.url), [data.url]);

  const serviceLabel =
    parsed.service !== "unknown" ? SERVICE_LABELS[parsed.service] : null;

  return (
    <fieldset className={FIELDSET_CLASSES}>
      <legend className={LEGEND_CLASSES}>
        Meeting Link
      </legend>
      <TextField
        id="meeting-url"
        label="Paste Meeting Link"
        type="text"
        placeholder="https://zoom.us/j/... or teams.microsoft.com/..."
        value={data.url}
        onChange={(e) => onChange({ url: e.target.value })}
      />

      {data.url && parsed.service !== "unknown" && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1 text-xs">
          {serviceLabel && (
            <p className="font-semibold text-teal-700 dark:text-teal-400">
              {serviceLabel} link detected
            </p>
          )}
          {parsed.meetingId && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="font-medium">Meeting ID:</span>{" "}
              {parsed.meetingId}
            </p>
          )}
          {parsed.passcode && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="font-medium">Passcode:</span> {parsed.passcode}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
};

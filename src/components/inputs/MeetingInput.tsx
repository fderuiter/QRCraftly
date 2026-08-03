import React, { useMemo } from "react";
import { MeetingData } from "../../types";
import { TextField } from "../ui/FormFields";
import { parseMeetingUrl } from "../../utils/meetingParsers";
import { FormBlock } from "../ui/FormBlock";

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
    <FormBlock legend="Meeting Link">
      <TextField
        id="meeting-url"
        label="Paste Meeting Link"
        type="text"
        placeholder="https://zoom.us/j/... or teams.microsoft.com/..."
        value={data.url}
        onChange={(e) => onChange({ url: e.target.value })}
      />

      {data.url && parsed.service !== "unknown" && (
        <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/60">
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
    </FormBlock>
  );
};

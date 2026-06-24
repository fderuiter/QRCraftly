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

import { VCardData } from "../../types";
import { normalizeUrl } from "../url";
import { ValidationEngine } from "../../engine/ValidationEngine";

/**
 * Escapes special characters for vCard property values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeVCardString = (str: string | undefined): string => {
  return ValidationEngine.escapeVCardEvent(str);
};

export const unescapeVCardString = (str: string | undefined): string => {
  return ValidationEngine.unescapeVCardEvent(str);
};

/**
 * Hydrates VCardData from a raw string.
 */
export const hydrateVCardData = (raw: string): VCardData => {
  const result: VCardData = {
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    phone: "",
    email: "",
    website: "",
    street: "",
    city: "",
    zip: "",
    country: "",
  };

  if (!raw.includes("BEGIN:VCARD")) return result;

  const lines = raw.split(/\r\n|\r|\n/);

  lines.forEach((line) => {
    const splitIndex = line.indexOf(":");
    if (splitIndex <= 0) return;

    const fullKey = line.substring(0, splitIndex);
    const key = fullKey.split(";")[0].toUpperCase();
    const value = line.substring(splitIndex + 1);

    switch (key) {
      case "N": {
        const nParts = value.split(ValidationEngine.REGEX_SPLIT_VCARD);
        result.lastName = unescapeVCardString(nParts[0] || "");
        result.firstName = unescapeVCardString(nParts[1] || "");
        break;
      }
      case "ORG":
        result.organization = unescapeVCardString(value);
        break;
      case "TITLE":
        result.title = unescapeVCardString(value);
        break;
      case "TEL":
        result.phone = unescapeVCardString(value);
        break;
      case "EMAIL":
        result.email = unescapeVCardString(value);
        break;
      case "URL":
        result.website = unescapeVCardString(value);
        break;
      case "ADR": {
        const adrParts = value.split(ValidationEngine.REGEX_SPLIT_VCARD);
        result.street = unescapeVCardString(adrParts[2] || "");
        result.city = unescapeVCardString(adrParts[3] || "");
        result.zip = unescapeVCardString(adrParts[5] || "");
        result.country = unescapeVCardString(adrParts[6] || "");
        break;
      }
    }
  });

  return result;
};

/**
 * Constructs the vCard 3.0 string.
 */
export const constructVCardString = (data: VCardData): string => {
  const lastName = escapeVCardString(data.lastName);
  const firstName = escapeVCardString(data.firstName);
  // Normalize URL first to handle spaces/protocols, then check for dangerous protocols on the normalized string
  const normalizedWebsite = normalizeUrl(data.website);
  const website = ValidationEngine.isDangerousUrl(normalizedWebsite)
    ? ""
    : escapeVCardString(normalizedWebsite);

  const parts = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`,
    `ORG:${escapeVCardString(data.organization)}`,
    `TITLE:${escapeVCardString(data.title)}`,
    `TEL:${escapeVCardString(data.phone)}`,
    `EMAIL:${escapeVCardString(data.email)}`,
    `URL:${website}`,
    `ADR:;;${escapeVCardString(data.street)};${escapeVCardString(data.city)};;${escapeVCardString(data.zip)};${escapeVCardString(data.country)}`,
    "END:VCARD",
  ];

  return parts.join("\n");
};

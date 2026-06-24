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

import { describe, it, expect } from "vitest";
import {
  constructWifiString,
  hydrateWifiData,
  unescapeWifiString,
  escapeWifiString,
} from "./wifi";
import { WifiEncryption } from "../../types";

describe("Wifi generator", () => {
  it("constructs and hydrates successfully", () => {
    const data = {
      ssid: "My Network",
      password: "password123;",
      encryption: WifiEncryption.WPA,
      hidden: true,
      eapIdentity: "",
    };
    const str = constructWifiString(data);
    const hydrated = hydrateWifiData(str);
    expect(hydrated).toEqual(data);
  });

  it("hydrates unknown fields or non-wifi strings", () => {
    const result = hydrateWifiData("random");
    expect(result.ssid).toBe("");

    const result2 = hydrateWifiData("WIFI:INVALID;;");
    expect(result2.ssid).toBe("");

    const result3 = hydrateWifiData("WIFI:T:UNKNOWN;;");
    expect(result3.encryption).toBe(WifiEncryption.WPA);
  });

  it("edge cases for unescaping", () => {
    expect(unescapeWifiString(undefined)).toBe("");
    expect(escapeWifiString(undefined)).toBe("");
  });

  it("hydrates WPA2-EAP identity", () => {
    const data = {
      ssid: "My Enterprise",
      password: "password123;",
      encryption: WifiEncryption.WPA2_EAP,
      hidden: false,
      eapIdentity: "user123",
    };
    const str = constructWifiString(data);
    const hydrated = hydrateWifiData(str);
    expect(hydrated).toEqual(data);
  });

  it("hydrates string ending with single semicolon", () => {
    const raw = "WIFI:S:MyNet;P:secret;T:WPA;";
    const hydrated = hydrateWifiData(raw);
    expect(hydrated.ssid).toBe("MyNet");
    expect(hydrated.password).toBe("secret");
    expect(hydrated.encryption).toBe(WifiEncryption.WPA);
  });

  it("hydrates string not ending with a semicolon", () => {
    const raw = "WIFI:S:NoSemiNet;P:password123;T:WPA";
    const hydrated = hydrateWifiData(raw);
    expect(hydrated.ssid).toBe("NoSemiNet");
    expect(hydrated.password).toBe("password123");
    expect(hydrated.encryption).toBe(WifiEncryption.WPA);
  });
});

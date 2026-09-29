/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

/** The two arcade modes. */
export type ArcadeMode = 'blaster' | 'simulator';

/** Mode metadata in display order. */
export const ARCADE_MODES: readonly { id: ArcadeMode; label: string; description: string }[] = [
  { id: 'blaster', label: 'Arcade Blaster', description: 'Aim the cannon and chip the code apart with plasma, lasers and rockets.' },
  { id: 'simulator', label: 'Damage Simulator', description: 'Strike modules precisely and watch the Reed-Solomon budget drain.' },
];

/**
 * Reads the mode from a query string. Unknown or missing values select the blaster.
 * @param search - A query string such as `?mode=simulator`.
 * @returns The mode.
 */
export function parseArcadeMode(search: string): ArcadeMode {
  const mode = new URLSearchParams(search).get('mode');
  return mode === 'simulator' ? 'simulator' : 'blaster';
}

/**
 * The canonical arcade URL for a mode (path and query only; never payload content).
 * @param mode - The mode.
 * @returns The URL.
 */
export function arcadeModeHref(mode: ArcadeMode): string {
  return `/arcade?mode=${mode}`;
}

/** Blaster weapons. */
export type BlasterWeaponId = 'plasma' | 'laser' | 'rocket';

/** Blaster weapon metadata, in shortcut order. */
export const BLASTER_WEAPONS: readonly { id: BlasterWeaponId; name: string; shortcut: string; description: string }[] = [
  { id: 'plasma', name: 'Plasma Blaster', shortcut: '1', description: 'Fast energy bolts that chip single micro-cells.' },
  { id: 'laser', name: 'Thermal Laser', shortcut: '2', description: 'A continuous cutting beam along the aiming vector while held.' },
  { id: 'rocket', name: 'Antimatter Rocket', shortcut: '3', description: 'Heavy rockets that blast a wide crater on impact.' },
];

/**
 * Blaster weapon bound to a keyboard shortcut.
 * @param key - `KeyboardEvent.key`.
 * @returns The weapon, or null when the key is not a weapon shortcut.
 */
export function blasterWeaponForKey(key: string): BlasterWeaponId | null {
  return BLASTER_WEAPONS.find((weapon) => weapon.shortcut === key)?.id ?? null;
}

/** Simulator weapons. */
export type SimulatorWeaponId = 'pinpoint' | 'plasma-charge' | 'neutron' | 'nuke';

/** Simulator weapon metadata with blast radii in modules. */
export const SIMULATOR_WEAPONS: readonly { id: SimulatorWeaponId; name: string; radius: number; area: string; description: string }[] = [
  { id: 'pinpoint', name: 'Pinpoint Laser', radius: 0, area: '1 module', description: 'Scorches exactly one module.' },
  { id: 'plasma-charge', name: 'Plasma Charge', radius: 1, area: '3×3', description: 'Scorches a 3×3 neighbourhood.' },
  { id: 'neutron', name: 'Neutron Blast', radius: 2, area: '5×5', description: 'Disrupts modules within a 5×5 area.' },
  { id: 'nuke', name: 'Thermonuclear Nuke', radius: 4, area: '9×9', description: 'Leaves a crater across a 9×9 sector.' },
];

/** Strikes in one artillery barrage. */
export const BARRAGE_STRIKES = 12;

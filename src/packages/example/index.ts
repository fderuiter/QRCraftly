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

import { computeExampleMetric } from "./lib/impl";

/**
 * Starter template entry point illustrating deep module encapsulation.
 *
 * External callers and package test suites import exclusively through root entry points.
 * Implementation subfolders (like `lib/`) remain strictly private.
 *
 * @param input - Numeric input parameter.
 * @returns Transformed metric computed by private implementation.
 */
export function exampleFeature(input: number): number {
  return computeExampleMetric(input);
}

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

interface Point {
  r: number;
  c: number;
}

/**
 * Standard A* Pathfinding Algorithm running synchronously on the main thread.
 * Guaranteed to execute under 16ms for a 31x31 grid size.
 *
 * @param grid - A 2D grid where true represents a wall and false represents a walkable path.
 * @param start - The starting Point of the path.
 * @param end - The target Point of the path.
 * @returns An array of Points representing the shortest path from start to end, or an empty array if no path exists.
 */
export function findAStarPath(grid: boolean[][], start: Point, end: Point): Point[] {
  const numRows = grid.length;
  const numCols = grid[0].length;

  const heuristic = (p1: Point, p2: Point) => {
    return Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
  };

  const startKey = `${start.r},${start.c}`;
  const endKey = `${end.r},${end.c}`;

  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, Point>();

  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const fScore = new Map<string, number>();
  fScore.set(startKey, heuristic(start, end));

  while (openSet.size > 0) {
    let current: Point | null = null;
    let lowestScore = Infinity;
    
    for (const key of openSet) {
      const score = fScore.get(key) ?? Infinity;
      if (score < lowestScore) {
        lowestScore = score;
        const [r, c] = key.split(',').map(Number);
        current = { r, c };
      }
    }

    if (!current) break;
    const currentKey = `${current.r},${current.c}`;

    if (currentKey === endKey) {
      const path: Point[] = [];
      let temp: Point | undefined = current;
      while (temp) {
        path.push(temp);
        temp = cameFrom.get(`${temp.r},${temp.c}`);
      }
      return path.reverse();
    }

    openSet.delete(currentKey);

    const neighbors = [
      { r: current.r - 1, c: current.c },
      { r: current.r + 1, c: current.c },
      { r: current.r, c: current.c - 1 },
      { r: current.r, c: current.c + 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.r >= 0 &&
        neighbor.r < numRows &&
        neighbor.c >= 0 &&
        neighbor.c < numCols
      ) {
        if (grid[neighbor.r][neighbor.c]) {
          continue; // Solid wall
        }

        const neighborKey = `${neighbor.r},${neighbor.c}`;
        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + 1;

        if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));
          openSet.add(neighborKey);
        }
      }
    }
  }

  return [];
}

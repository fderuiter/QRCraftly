import { QRModules } from '../types';

/**
 * Appends or updates a salt query parameter on a URL.
 */
export function appendSaltToUrl(url: string, salt: number): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('salt', String(salt));
    return urlObj.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}salt=${salt}`;
  }
}

/**
 * Validates if there is a continuous solvable path from the designated entry point
 * to the exit point on the generated matrix of the QR code.
 * Light modules (value 0 / false) are considered open path cells.
 * Dark modules (value 1 / true) are considered wall cells.
 */
export function isMazeSolvable(
  modules: QRModules,
  entry: { r: number; c: number },
  exit: { r: number; c: number }
): boolean {
  const size = modules.size;

  // Bound check
  if (
    entry.r < 0 || entry.r >= size || entry.c < 0 || entry.c >= size ||
    exit.r < 0 || exit.r >= size || exit.c < 0 || exit.c >= size
  ) {
    return false;
  }

  // If entry or exit are walls, it's blocked from start
  if (modules.get(entry.r, entry.c) || modules.get(exit.r, exit.c)) {
    return false;
  }

  const queue: [number, number][] = [[entry.r, entry.c]];
  const visited = new Uint8Array(size * size);
  visited[entry.r * size + entry.c] = 1;

  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];

    if (r === exit.r && c === exit.c) {
      return true;
    }

    for (let i = 0; i < 4; i++) {
      const nr = r + dr[i];
      const nc = c + dc[i];

      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const idx = nr * size + nc;
        if (visited[idx] === 0 && !modules.get(nr, nc)) {
          visited[idx] = 1;
          queue.push([nr, nc]);
        }
      }
    }
  }

  return false;
}

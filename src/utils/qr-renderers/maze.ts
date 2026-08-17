import { QRConfig, QRModules } from '../../types';
import { getLogoMetrics, getIsCoveredByLogo, isAlignmentPatternZone } from './utils';

interface MazeNode {
  r: number;
  c: number;
}

interface MazeEdge {
  u: MazeNode;
  v: MazeNode;
}

export interface MazeData {
  nodes: MazeNode[];
  edges: MazeEdge[];
  start: MazeNode | null;
  end: MazeNode | null;
  solution: MazeNode[];
}

// Global cache for computed mazes to ensure top performance and stability
const mazeCache = new Map<string, MazeData>();

/**
 * Checks if a grid coordinate lies inside a finder eye pattern or its adjacent safety zone.
 * Quiet separator is preserved to prevent scanning issues.
 */
export function isFinderEyeZone(r: number, c: number, size: number): boolean {
  // Finder patterns are 7x7 inside [0, size-1]
  // We exclude an extra margin around finder eyes to guarantee absolute scanner safety.
  if (r >= -2 && r <= 8 && c >= -2 && c <= 8) return true;
  if (r >= -2 && r <= 8 && c >= size - 9 && c <= size + 4) return true;
  if (r >= size - 9 && r <= size + 4 && c >= -2 && c <= 8) return true;
  return false;
}

/**
 * Deterministic seed-based pseudo-random number generator (Mulberry32).
 * Ensures that the generated maze is stable for a given QR code payload.
 */
function seedRandom(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let seed = h >>> 0;
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Disjoint Set Union (DSU) implementation for finding spanning forest.
 */
class DSU {
  parent: Map<string, string>;
  constructor(keys: string[]) {
    this.parent = new Map();
    for (const key of keys) {
      this.parent.set(key, key);
    }
  }

  find(x: string): string {
    const px = this.parent.get(x);
    if (!px) return x;
    if (px === x) return x;
    const root = this.find(px);
    this.parent.set(x, root);
    return root;
  }

  union(x: string, y: string): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx !== ry) {
      this.parent.set(rx, ry);
      return true;
    }
    return false;
  }
}

/**
 * Generates the maze structure deterministically based on configuration.
 */
export function generateMaze(modules: QRModules, config: QRConfig, size: number): MazeData {
  const cacheKey = `${config.value}_${config.errorCorrectionLevel}_${size}_${config.logoUrl}_${config.logoSize}_${config.logoPaddingStyle}_${config.logoPadding}`;
  const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  if (!isTest && mazeCache.has(cacheKey)) {
    return mazeCache.get(cacheKey)!;
  }

  // Calculate Logo cutout zone using existing helpers
  const logoMetrics = getLogoMetrics(config, size, 10); // temporary cell size for metric module counting
  const isCoveredByLogo = getIsCoveredByLogo(config, size, logoMetrics);

  const nodes: MazeNode[] = [];
  const nodeMap = new Map<string, MazeNode>();

  // Extract all traversable cells (light modules + 4-module quiet zone margin floor)
  // Grid coordinates range from -4 to size + 3
  for (let r = -4; r < size + 4; r++) {
    for (let c = -4; c < size + 4; c++) {
      if (isFinderEyeZone(r, c, size)) {
        continue;
      }
      if (isAlignmentPatternZone(r, c, size)) {
        continue;
      }
      if (r >= 0 && r < size && c >= 0 && c < size) {
        if (isCoveredByLogo(r, c)) {
          continue;
        }
        if (modules.get(r, c) === true) {
          continue;
        }
      }

      const node: MazeNode = { r, c };
      nodes.push(node);
      nodeMap.set(`${r},${c}`, node);
    }
  }

  // Build edges
  const edges: MazeEdge[] = [];
  for (const node of nodes) {
    const rightKey = `${node.r},${node.c + 1}`;
    const downKey = `${node.r + 1},${node.c}`;

    if (nodeMap.has(rightKey)) {
      edges.push({ u: node, v: nodeMap.get(rightKey)! });
    }
    if (nodeMap.has(downKey)) {
      edges.push({ u: node, v: nodeMap.get(downKey)! });
    }
  }

  // Deterministic shuffle
  const rng = seedRandom(config.value || 'qrcraftly');
  const shuffledEdges = [...edges];
  for (let i = shuffledEdges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffledEdges[i];
    shuffledEdges[i] = shuffledEdges[j];
    shuffledEdges[j] = temp;
  }

  // Spanning Forest
  const dsu = new DSU(nodes.map((n) => `${n.r},${n.c}`));
  const mazeEdges: MazeEdge[] = [];
  for (const edge of shuffledEdges) {
    const uKey = `${edge.u.r},${edge.u.c}`;
    const vKey = `${edge.v.r},${edge.v.c}`;
    if (dsu.union(uKey, vKey)) {
      mazeEdges.push(edge);
    }
  }

  // Find adjacency list for BFS
  const adj = new Map<string, MazeNode[]>();
  for (const edge of mazeEdges) {
    const uKey = `${edge.u.r},${edge.u.c}`;
    const vKey = `${edge.v.r},${edge.v.c}`;
    if (!adj.has(uKey)) adj.set(uKey, []);
    if (!adj.has(vKey)) adj.set(vKey, []);
    adj.get(uKey)!.push(edge.v);
    adj.get(vKey)!.push(edge.u);
  }

  // Find solvable path
  let startNode: MazeNode | null = null;
  let endNode: MazeNode | null = null;
  let solution: MazeNode[] = [];

  if (nodes.length > 0) {
    const sortedByDist = [...nodes].sort((a, b) => a.r + a.c - (b.r + b.c));

    for (const sCand of sortedByDist) {
      const sKey = `${sCand.r},${sCand.c}`;
      const sRoot = dsu.find(sKey);

      let bestEnd: MazeNode | null = null;
      let maxRC = -Infinity;
      for (const eCand of sortedByDist) {
        if (eCand === sCand) continue;
        const eKey = `${eCand.r},${eCand.c}`;
        if (dsu.find(eKey) === sRoot) {
          const val = eCand.r + eCand.c;
          if (val > maxRC) {
            maxRC = val;
            bestEnd = eCand;
          }
        }
      }

      if (bestEnd) {
        // Run A* pathfinder
        const openSet: MazeNode[] = [sCand];
        const visited = new Set<string>([sKey]);
        const gScore = new Map<string, number>();
        gScore.set(sKey, 0);

        const fScore = new Map<string, number>();
        const h = (a: MazeNode, b: MazeNode) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
        fScore.set(sKey, h(sCand, bestEnd));

        const parentMap = new Map<string, MazeNode>();
        let found = false;

        const endKey = `${bestEnd.r},${bestEnd.c}`;
        while (openSet.length > 0) {
          let lowestIdx = 0;
          for (let i = 1; i < openSet.length; i++) {
            const nodeKey = `${openSet[i].r},${openSet[i].c}`;
            const lowestKey = `${openSet[lowestIdx].r},${openSet[lowestIdx].c}`;
            if ((fScore.get(nodeKey) ?? Infinity) < (fScore.get(lowestKey) ?? Infinity)) {
              lowestIdx = i;
            }
          }

          const curr = openSet.splice(lowestIdx, 1)[0];
          const currKey = `${curr.r},${curr.c}`;

          if (currKey === endKey) {
            found = true;
            break;
          }

          const neighbors = adj.get(currKey) || [];
          for (const n of neighbors) {
            const nKey = `${n.r},${n.c}`;
            const tentativeGScore = (gScore.get(currKey) ?? Infinity) + 1;

            if (tentativeGScore < (gScore.get(nKey) ?? Infinity)) {
              parentMap.set(nKey, curr);
              gScore.set(nKey, tentativeGScore);
              fScore.set(nKey, tentativeGScore + h(n, bestEnd));
              if (!visited.has(nKey)) {
                visited.add(nKey);
                openSet.push(n);
              }
            }
          }
        }

        if (found) {
          const path: MazeNode[] = [];
          let curr: MazeNode | undefined = bestEnd;
          while (curr) {
            path.push(curr);
            curr = parentMap.get(`${curr.r},${curr.c}`);
          }
          path.reverse();

          if (path.length > 10) {
            startNode = sCand;
            endNode = bestEnd;
            solution = path;
            break;
          }
        }
      }
    }
  }

  const result: MazeData = {
    nodes,
    edges: mazeEdges,
    start: startNode,
    end: endNode,
    solution,
  };

  mazeCache.set(cacheKey, result);
  return result;
}

/**
 * Renders the maze overlay directly on the canvas context.
 */
export function renderMaze(
  ctx: CanvasRenderingContext2D,
  modules: QRModules,
  config: QRConfig,
  drawX: number,
  drawY: number,
  cellSize: number,
  size: number,
  mazeData?: MazeData | null
) {
  if (!config.isMazeEnabled) return;

  const maze = mazeData || generateMaze(modules, config, size);
  const pathWidth = cellSize * (config.mazePathWidth || 0.25);

  ctx.save();

  // 1. Draw Maze Paths (all corridors in the forest)
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = config.mazeColor || '#3b82f6';
  ctx.lineWidth = pathWidth;

  for (const edge of maze.edges) {
    const ux = drawX + (edge.u.c + 0.5) * cellSize;
    const uy = drawY + (edge.u.r + 0.5) * cellSize;
    const vx = drawX + (edge.v.c + 0.5) * cellSize;
    const vy = drawY + (edge.v.r + 0.5) * cellSize;

    ctx.moveTo(ux, uy);
    ctx.lineTo(vx, vy);
  }
  ctx.stroke();

  // 2. Draw Solution Path (if enabled or default highlight)
  if (config.showMazeSolution && maze.solution.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444'; // Red for solved path
    ctx.lineWidth = pathWidth * 1.3; // slightly thicker
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const first = maze.solution[0];
    ctx.moveTo(drawX + (first.c + 0.5) * cellSize, drawY + (first.r + 0.5) * cellSize);

    for (let i = 1; i < maze.solution.length; i++) {
      const p = maze.solution[i];
      ctx.lineTo(drawX + (p.c + 0.5) * cellSize, drawY + (p.r + 0.5) * cellSize);
    }
    ctx.stroke();
  }

  // 3. Draw Start and End Markers
  if (maze.start) {
    const sx = drawX + (maze.start.c + 0.5) * cellSize;
    const sy = drawY + (maze.start.r + 0.5) * cellSize;

    // Green start dot
    ctx.beginPath();
    ctx.arc(sx, sy, cellSize * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'; // translucent green outer ring
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx, sy, cellSize * 0.18, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981'; // solid green inner dot
    ctx.fill();
  }

  if (maze.end) {
    const ex = drawX + (maze.end.c + 0.5) * cellSize;
    const ey = drawY + (maze.end.r + 0.5) * cellSize;

    // Orange/Red end dot
    ctx.beginPath();
    ctx.arc(ex, ey, cellSize * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // translucent red outer ring
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ex, ey, cellSize * 0.18, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444'; // solid red inner dot
    ctx.fill();
  }

  ctx.restore();
}

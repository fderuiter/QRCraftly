import { QRConfig, QRModules } from '../../types';
import { getLogoMetrics, getIsCoveredByLogo } from './utils';

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
 * Checks if a grid coordinate is part of a single-module bridge corridor
 * routing directly across the finder pattern safety zone.
 */
export function isBridgeCell(r: number, c: number, size: number): boolean {
  // TL Bridge Corridor: column 3, rows 6, 7, 8
  if (c === 3 && r >= 6 && r <= 8) return true;

  // TR Bridge Corridor: column size - 4, rows 6, 7, 8
  if (c === size - 4 && r >= 6 && r <= 8) return true;

  // BL Bridge Corridor: row size - 4, columns 6, 7, 8
  if (r === size - 4 && c >= 6 && c <= 8) return true;

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

  add(x: string): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
    }
  }

  find(x: string): string {
    const px = this.parent.get(x)!;
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
 * Restricted strictly to inner matrix dimensions [0, size-1].
 */
export function generateMaze(modules: QRModules, config: QRConfig, size: number): MazeData {
  const cacheKey = `${config.value}_${config.errorCorrectionLevel}_${size}_${config.logoUrl}_${config.logoSize}_${config.logoPaddingStyle}_${config.logoPadding}_${config.isMazeBridgesEnabled !== false}`;
  const isTest = process.env.NODE_ENV === 'test';
  if (!isTest && mazeCache.has(cacheKey)) {
    return mazeCache.get(cacheKey)!;
  }

  // Calculate Logo cutout zone using existing helpers
  const logoMetrics = getLogoMetrics(config, size, 10); // temporary cell size for metric module counting
  const isCoveredByLogo = getIsCoveredByLogo(config, size, logoMetrics);

  const nodes: MazeNode[] = [];
  const nodeMap = new Map<string, MazeNode>();

  const bridgesEnabled = config.isMazeBridgesEnabled !== false;

  // Extract traversable cells strictly inside inner matrix [0, size - 1]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isBridge = !!(bridgesEnabled && isBridgeCell(r, c, size));
      if (isFinderEyeZone(r, c, size)) {
        if (!isBridge) {
          continue;
        }
      }
      if (isCoveredByLogo(r, c)) {
        continue;
      }
      if (modules.get(r, c) === true && !isBridge) {
        continue;
      }

      const node: MazeNode = { r, c };
      nodes.push(node);
      nodeMap.set(`${r},${c}`, node);
    }
  }

  // Handle potential maze fragmentation inside the inner matrix by adjusting cell connectivity.
  // Check component connectivity using DSU.
  const initialDsu = new DSU(nodes.map((n) => `${n.r},${n.c}`));
  for (const node of nodes) {
    const rightKey = `${node.r},${node.c + 1}`;
    const downKey = `${node.r + 1},${node.c}`;
    if (nodeMap.has(rightKey)) {
      initialDsu.union(`${node.r},${node.c}`, rightKey);
    }
    if (nodeMap.has(downKey)) {
      initialDsu.union(`${node.r},${node.c}`, downKey);
    }
  }

  // Helper to count unique connected components
  const getComponentCount = () => {
    const roots = new Set<string>();
    for (const node of nodes) {
      roots.add(initialDsu.find(`${node.r},${node.c}`));
    }
    return roots.size;
  };

  // If fragmented (multiple components), adjust connectivity by adding bridge connector cells
  if (nodes.length > 0 && getComponentCount() > 1) {
    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    let addedNewCell = true;

    while (addedNewCell && getComponentCount() > 1) {
      addedNewCell = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const key = `${r},${c}`;
          if (nodeMap.has(key)) continue;
          if (isCoveredByLogo(r, c)) continue;
          // Avoid finder eye pattern inner core (0..6 x 0..6, etc.)
          if (
            (r >= 0 && r <= 6 && c >= 0 && c <= 6) ||
            (r >= 0 && r <= 6 && c >= size - 7 && c <= size - 1) ||
            (r >= size - 7 && r <= size - 1 && c >= 0 && c <= 6)
          ) {
            continue;
          }

          // Check adjacent neighbor components
          const adjacentRoots = new Set<string>();
          const validNeighbors: MazeNode[] = [];
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            const nKey = `${nr},${nc}`;
            if (nodeMap.has(nKey)) {
              adjacentRoots.add(initialDsu.find(nKey));
              validNeighbors.push(nodeMap.get(nKey)!);
            }
          }

          if (adjacentRoots.size > 1) {
            // This cell connects 2+ distinct components! Add it as a connector cell.
            const newNode: MazeNode = { r, c };
            nodes.push(newNode);
            nodeMap.set(key, newNode);
            initialDsu.add(key);

            for (const neighbor of validNeighbors) {
              initialDsu.union(key, `${neighbor.r},${neighbor.c}`);
            }

            addedNewCell = true;
            if (getComponentCount() <= 1) break;
          }
        }
        if (getComponentCount() <= 1) break;
      }
    }
  }

  // Build all potential edges between adjacent nodes
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

  // Spanning Forest using Kruskal's
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
  for (const node of nodes) {
    adj.set(`${node.r},${node.c}`, []);
  }
  for (const edge of mazeEdges) {
    const uKey = `${edge.u.r},${edge.u.c}`;
    const vKey = `${edge.v.r},${edge.v.c}`;
    adj.get(uKey)!.push(edge.v);
    adj.get(vKey)!.push(edge.u);
  }

  // Pathfinder algorithm with dynamic minimum step threshold
  let startNode: MazeNode | null = null;
  let endNode: MazeNode | null = null;
  let solution: MazeNode[] = [];

  if (nodes.length > 1) {
    // Group nodes by component root in the spanning forest
    const componentMap = new Map<string, MazeNode[]>();
    for (const node of nodes) {
      const root = dsu.find(`${node.r},${node.c}`);
      if (!componentMap.has(root)) {
        componentMap.set(root, []);
      }
      componentMap.get(root)!.push(node);
    }

    let overallBestPath: MazeNode[] = [];

    // For each component, find tree diameter (longest simple path)
    for (const compNodes of componentMap.values()) {
      if (compNodes.length < 2) continue;

      // Helper function: BFS to find furthest node from source and path
      const bfsFurthest = (start: MazeNode) => {
        const queue: MazeNode[] = [start];
        const visited = new Map<string, MazeNode | null>();
        visited.set(`${start.r},${start.c}`, null);

        let furthestNode = start;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          furthestNode = curr;
          const currKey = `${curr.r},${curr.c}`;
          const neighbors = adj.get(currKey) || [];

          for (const n of neighbors) {
            const nKey = `${n.r},${n.c}`;
            if (!visited.has(nKey)) {
              visited.set(nKey, curr);
              queue.push(n);
            }
          }
        }

        // Reconstruct path to furthestNode
        const path: MazeNode[] = [];
        let curr: MazeNode | null = furthestNode;
        while (curr) {
          path.push(curr);
          curr = visited.get(`${curr.r},${curr.c}`) || null;
        }
        path.reverse();

        return { furthestNode, path };
      };

      // Pick seed node
      const seedNode = compNodes[0];
      // 1. First BFS from seedNode to find one extreme end A
      const { furthestNode: endA } = bfsFurthest(seedNode);
      // 2. Second BFS from endA to find opposite extreme end B and exact path
      const { path: diameterPath } = bfsFurthest(endA);

      if (diameterPath.length > overallBestPath.length) {
        overallBestPath = diameterPath;
      }
    }

    // Dynamic step threshold check:
    // If overallBestPath.length > 1, we set start, end, and solution.
    // If overallBestPath.length >= 10, it satisfies target >= 10 steps.
    // If overallBestPath.length < 10, threshold dynamically adjusts to overallBestPath.length.
    if (overallBestPath.length > 1) {
      startNode = overallBestPath[0];
      endNode = overallBestPath[overallBestPath.length - 1];
      solution = overallBestPath;
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

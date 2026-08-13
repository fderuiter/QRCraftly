import { getLogoMetrics, getIsCoveredByLogo } from './qr-renderers/utils';
import { isFinderEyeZone } from './qr-renderers/maze';
import { QRConfig } from '../types';

interface MazeNode {
  r: number;
  c: number;
}

interface MazeEdge {
  u: MazeNode;
  v: MazeNode;
}

interface MazeData {
  nodes: MazeNode[];
  edges: MazeEdge[];
  start: MazeNode | null;
  end: MazeNode | null;
  solution: MazeNode[];
}

let latestSequenceId = -1;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function assertInputSchema(data: any): asserts data is {
  grid: Uint8Array;
  size: number;
  config: QRConfig;
  sequenceId: number;
} {
  if (!data || typeof data !== 'object') {
    throw new Error('Input must be an object');
  }
  if (!(data.grid instanceof Uint8Array)) {
    throw new Error('grid must be a Uint8Array');
  }
  if (typeof data.size !== 'number' || data.size <= 0) {
    throw new Error('size must be a positive number');
  }
  if (data.grid.length !== data.size * data.size) {
    throw new Error('grid length must match size squared');
  }
  if (!data.config || typeof data.config !== 'object') {
    throw new Error('config must be an object');
  }
  if (typeof data.config.value !== 'string') {
    throw new Error('config.value must be a string');
  }
  if (typeof data.sequenceId !== 'number') {
    throw new Error('sequenceId must be a number');
  }
}

export function serializeMazeData(maze: MazeData): {
  nodes: Int16Array;
  edges: Int16Array;
  start: Int16Array;
  end: Int16Array;
  solution: Int16Array;
} {
  const nodes = new Int16Array(maze.nodes.length * 2);
  for (let i = 0; i < maze.nodes.length; i++) {
    nodes[i * 2] = maze.nodes[i].r;
    nodes[i * 2 + 1] = maze.nodes[i].c;
  }

  const edges = new Int16Array(maze.edges.length * 4);
  for (let i = 0; i < maze.edges.length; i++) {
    edges[i * 4] = maze.edges[i].u.r;
    edges[i * 4 + 1] = maze.edges[i].u.c;
    edges[i * 4 + 2] = maze.edges[i].v.r;
    edges[i * 4 + 3] = maze.edges[i].v.c;
  }

  const start = maze.start ? new Int16Array([maze.start.r, maze.start.c]) : new Int16Array(0);
  const end = maze.end ? new Int16Array([maze.end.r, maze.end.c]) : new Int16Array(0);

  const solution = new Int16Array(maze.solution.length * 2);
  for (let i = 0; i < maze.solution.length; i++) {
    solution[i * 2] = maze.solution[i].r;
    solution[i * 2 + 1] = maze.solution[i].c;
  }

  return { nodes, edges, start, end, solution };
}

export function deserializeMazeData(serialized: {
  nodes: Int16Array;
  edges: Int16Array;
  start: Int16Array;
  end: Int16Array;
  solution: Int16Array;
}): MazeData {
  const nodes: MazeNode[] = [];
  for (let i = 0; i < serialized.nodes.length; i += 2) {
    nodes.push({ r: serialized.nodes[i], c: serialized.nodes[i + 1] });
  }

  const edges: MazeEdge[] = [];
  for (let i = 0; i < serialized.edges.length; i += 4) {
    edges.push({
      u: { r: serialized.edges[i], c: serialized.edges[i + 1] },
      v: { r: serialized.edges[i + 2], c: serialized.edges[i + 3] },
    });
  }

  const start = serialized.start.length === 2 ? { r: serialized.start[0], c: serialized.start[1] } : null;
  const end = serialized.end.length === 2 ? { r: serialized.end[0], c: serialized.end[1] } : null;

  const solution: MazeNode[] = [];
  for (let i = 0; i < serialized.solution.length; i += 2) {
    solution.push({ r: serialized.solution[i], c: serialized.solution[i + 1] });
  }

  return { nodes, edges, start, end, solution };
}

export function assertOutputSchema(data: any): asserts data is {
  status: string;
  sequenceId: number;
  nodes?: Int16Array;
  edges?: Int16Array;
  start?: Int16Array;
  end?: Int16Array;
  solution?: Int16Array;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    throw new Error('Output must be an object');
  }
  if (typeof data.status !== 'string') {
    throw new Error('status must be a string');
  }
  if (typeof data.sequenceId !== 'number') {
    throw new Error('sequenceId must be a number');
  }
  if (data.status === 'success') {
    if (!(data.nodes instanceof Int16Array)) throw new Error('nodes must be Int16Array');
    if (!(data.edges instanceof Int16Array)) throw new Error('edges must be Int16Array');
    if (!(data.start instanceof Int16Array)) throw new Error('start must be Int16Array');
    if (!(data.end instanceof Int16Array)) throw new Error('end must be Int16Array');
    if (!(data.solution instanceof Int16Array)) throw new Error('solution must be Int16Array');
  }
}

// Mulberry32 RNG
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

async function generateMazeCooperative(
  modules: { get: (r: number, c: number) => boolean },
  config: QRConfig,
  size: number,
  sequenceId: number,
  getLatestSequenceId: () => number
): Promise<MazeData> {
  let lastYieldTime = performance.now();

  const checkYield = async () => {
    if (performance.now() - lastYieldTime > 1.0) {
      await yieldToEventLoop();
      lastYieldTime = performance.now();
      if (sequenceId < getLatestSequenceId()) {
        throw new Error('INTERRUPTED');
      }
    }
  };

  const logoMetrics = getLogoMetrics(config, size, 10);
  const isCoveredByLogo = getIsCoveredByLogo(config, size, logoMetrics);

  const nodes: MazeNode[] = [];
  const nodeMap = new Map<string, MazeNode>();

  // Extract all traversable cells
  for (let r = -4; r < size + 4; r++) {
    await checkYield();
    for (let c = -4; c < size + 4; c++) {
      if (isFinderEyeZone(r, c, size)) {
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
    await checkYield();
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
    if (i % 50 === 0) {
      await checkYield();
    }
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffledEdges[i];
    shuffledEdges[i] = shuffledEdges[j];
    shuffledEdges[j] = temp;
  }

  // Spanning Forest
  const dsu = new DSU(nodes.map((n) => `${n.r},${n.c}`));
  const mazeEdges: MazeEdge[] = [];
  for (let idx = 0; idx < shuffledEdges.length; idx++) {
    if (idx % 50 === 0) {
      await checkYield();
    }
    const edge = shuffledEdges[idx];
    const uKey = `${edge.u.r},${edge.u.c}`;
    const vKey = `${edge.v.r},${edge.v.c}`;
    if (dsu.union(uKey, vKey)) {
      mazeEdges.push(edge);
    }
  }

  // Find adjacency list for BFS
  const adj = new Map<string, MazeNode[]>();
  for (let idx = 0; idx < mazeEdges.length; idx++) {
    if (idx % 50 === 0) {
      await checkYield();
    }
    const edge = mazeEdges[idx];
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

    for (let sIdx = 0; sIdx < sortedByDist.length; sIdx++) {
      await checkYield();
      const sCand = sortedByDist[sIdx];
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
        // Run BFS pathfinder
        const queue: MazeNode[] = [sCand];
        const visited = new Set<string>([sKey]);
        const parentMap = new Map<string, MazeNode>();
        let found = false;

        const endKey = `${bestEnd.r},${bestEnd.c}`;
        while (queue.length > 0) {
          if (queue.length % 50 === 0) {
            await checkYield();
          }
          const curr = queue.shift()!;
          const currKey = `${curr.r},${curr.c}`;
          if (currKey === endKey) {
            found = true;
            break;
          }

          const neighbors = adj.get(currKey) || [];
          for (const n of neighbors) {
            const nKey = `${n.r},${n.c}`;
            if (!visited.has(nKey)) {
              visited.add(nKey);
              parentMap.set(nKey, curr);
              queue.push(n);
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

  return {
    nodes,
    edges: mazeEdges,
    start: startNode,
    end: endNode,
    solution,
  };
}

if (typeof self !== 'undefined') {
  self.onmessage = async (e: MessageEvent<any>) => {
    const data = e.data;

    try {
      if (data && typeof data === 'object' && typeof data.sequenceId === 'number') {
        if (data.sequenceId > latestSequenceId) {
          latestSequenceId = data.sequenceId;
        }
      }

      // Assert schema
      assertInputSchema(data);

      const { grid, size, config, sequenceId } = data;

      // Yield initially to let subsequent rapid changes interrupt immediately
      await yieldToEventLoop();

      if (sequenceId < latestSequenceId) {
        return;
      }

      const mockModules = {
        get: (r: number, c: number) => {
          return grid[r * size + c] === 1;
        },
      };

      const mazeResult = await generateMazeCooperative(
        mockModules,
        config,
        size,
        sequenceId,
        () => latestSequenceId
      );

      if (sequenceId === latestSequenceId) {
        const serialized = serializeMazeData(mazeResult);
        const transferables = [
          serialized.nodes.buffer,
          serialized.edges.buffer,
          serialized.start.buffer,
          serialized.end.buffer,
          serialized.solution.buffer,
        ];

        (self as any).postMessage({
          status: 'success',
          sequenceId,
          nodes: serialized.nodes,
          edges: serialized.edges,
          start: serialized.start,
          end: serialized.end,
          solution: serialized.solution,
        }, transferables);
      }
    } catch (error: any) {
      if (error?.message === 'INTERRUPTED') {
        return;
      }

      if (typeof data === 'object' && typeof data.sequenceId === 'number' && data.sequenceId === latestSequenceId) {
        self.postMessage({
          status: 'error',
          sequenceId: data.sequenceId,
          error: error?.message || 'MAZE_GENERATION_FAILED',
        });
      }
    }
  };
}

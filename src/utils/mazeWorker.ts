import { getLogoMetrics, getIsCoveredByLogo } from './qr-renderers/utils';
import { isFinderEyeZone } from './qr-renderers/maze';
import { QRConfig } from '../types';
import {
  MazeNode,
  MazeEdge,
  MazeData,
  assertInputSchema,
  serializeMazeData,
} from './mazeWorkerShared';

let latestSequenceId = -1;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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

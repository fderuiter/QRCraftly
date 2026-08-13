import { QRConfig } from '../types';

export interface MazeNode {
  r: number;
  c: number;
}

export interface MazeEdge {
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

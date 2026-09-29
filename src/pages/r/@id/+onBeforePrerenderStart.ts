/**
 * Pre-renders a single static shell of the dynamic link resolver at `/r/shell`.
 * Real ids are never known at build time; the edge-redirect Worker
 * (`src/packages/edge-redirect/worker.ts`) serves this shell for each `/r/<id>`.
 * @returns The one URL to pre-render.
 */
export default function onBeforePrerenderStart(): string[] {
  return ['/r/shell'];
}

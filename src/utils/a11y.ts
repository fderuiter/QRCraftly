export function combineIds(...ids: (string | undefined | null | false)[]): string | undefined {
  const combined = ids.filter(Boolean).join(' ');
  return combined.length > 0 ? combined : undefined;
}

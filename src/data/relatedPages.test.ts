import { describe, expect, it } from 'vitest';
import { contentRegistry } from './contentRegistry';
import { TYPE_PAGE_TYPES, getExampleImage, getRelatedTypePages } from './relatedPages';

describe('getRelatedTypePages', () => {
  const ids = Object.keys(TYPE_PAGE_TYPES);

  it('links onward to four other generator pages, never to itself', () => {
    for (const id of ids) {
      const related = getRelatedTypePages(id);
      expect(related).toHaveLength(4);
      expect(related.map((page) => page.id)).not.toContain(id);
    }
  });

  it('links every generator page from somewhere', () => {
    const linked = new Set(ids.flatMap((id) => getRelatedTypePages(id).map((page) => page.id)));
    expect([...linked].sort()).toEqual([...ids].sort());
  });

  it('points the home page at "/" and the rest at their route', () => {
    expect(getRelatedTypePages('bulk-csv-qr-code')[0]).toMatchObject({ id: 'index', href: '/' });
    expect(getRelatedTypePages('index')[0]).toMatchObject({ id: ids[1], href: `/${ids[1]}` });
  });

  it('returns nothing for pages that are not generators', () => {
    expect(getRelatedTypePages('about')).toEqual([]);
  });
});

describe('getExampleImage', () => {
  it('describes an example picture for each generator page', () => {
    for (const id of Object.keys(TYPE_PAGE_TYPES)) {
      const example = getExampleImage(id);
      expect(example?.src).toBe(`/examples/${id}.svg`);
      expect(example?.alt).toContain(contentRegistry[id].name);
    }
  });

  it('has none for other pages', () => {
    expect(getExampleImage('security')).toBeUndefined();
  });
});

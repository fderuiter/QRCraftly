/**
 * The resolver is pre-rendered once, as the static shell `/r/shell/index.html`
 * (see +onBeforePrerenderStart.ts). The edge-redirect Worker serves that shell for
 * every existing `/r/<id>`, and the page reads the id from the address bar.
 */
export default {
  prerender: true,
};

import { getMetadataForPageContext, MetadataPageContext } from "../data/contentRegistry";

/**
 * Page title from the content registry (the 404 page uses the `_error` entry).
 * @param pageContext - Vike page context.
 * @returns The document title.
 */
export default function title(pageContext: MetadataPageContext) {
  return getMetadataForPageContext(pageContext).title;
}

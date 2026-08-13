import { getMetadataForPath } from "../data/contentRegistry";

/**
 *
 * @param pageContext
 */
export default function title(pageContext: any) {
  return getMetadataForPath(pageContext.urlPathname).title;
}

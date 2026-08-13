import { getMetadataForPath } from "../data/contentRegistry";

/**
 *
 * @param pageContext
 */
export default function description(pageContext: any) {
  return getMetadataForPath(pageContext.urlPathname).description;
}

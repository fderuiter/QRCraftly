import { usePageContext } from 'vike-react/usePageContext';

import { QRTypePage } from '../components/QRTypePage';
import { QRType } from '../types';
import { contentRegistry } from '../data/contentRegistry';

import { generateSchema } from './schemaGenerator';
import { resolveDomainForPath } from './metadataEngine';

/**
 * Creates a generic QR code generator page to eliminate boilerplate.
 */
export function createQRPage(type: QRType, title: string, toolId: string) {
  return function Page() {
    const pageContext = usePageContext();
    const resolvedDomain = resolveDomainForPath(pageContext.urlPathname);
    const content = contentRegistry[toolId as keyof typeof contentRegistry];
    // @ts-ignore
    const schemaData = generateSchema(content, resolvedDomain, pageContext.urlPathname);

    return <QRTypePage type={type} title={title} schemaData={schemaData} toolId={toolId} />;
  };
}

import { getConfiguredPublicDomain } from './publicEnvironment';

export const getPublicDomain = (): string => {
  return getConfiguredPublicDomain().replace(/\/+$/, '');
};

const sanitizedPathCache = new Map<string, string>();
const domainForPathCache = new Map<string, string>();
const publicUrlCache = new Map<string, string>();

export const resolveDomainForPath = (path: string): string => {
  const domain = getPublicDomain();
  const cacheKey = `${domain}::${path}`;
  if (domainForPathCache.has(cacheKey)) {
    return domainForPathCache.get(cacheKey)!;
  }

  if (!path) {
    domainForPathCache.set(cacheKey, domain);
    return domain;
  }
  
  let cleanPath = path;
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  const subdomainMatch = cleanPath.match(/^\/_subdomain\/([^\/]+)/);
  if (subdomainMatch) {
    const subdomain = subdomainMatch[1];
    try {
      const url = new URL(domain);
      url.hostname = `${subdomain}.${url.hostname}`;
      const result = `${url.protocol}//${url.host}`;
      domainForPathCache.set(cacheKey, result);
      return result;
    } catch (_e) {
      // Fallback
    }
  }
  domainForPathCache.set(cacheKey, domain);
  return domain;
};

const normalizeTrailingSlashes = (path: string): string => {
  if (!path) return '/';
  
  const qMarkIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  
  let endOfPathIndex = path.length;
  if (qMarkIndex !== -1 && hashIndex !== -1) {
    endOfPathIndex = Math.min(qMarkIndex, hashIndex);
  } else if (qMarkIndex !== -1) {
    endOfPathIndex = qMarkIndex;
  } else if (hashIndex !== -1) {
    endOfPathIndex = hashIndex;
  }
  
  let pathPart = path.slice(0, endOfPathIndex);
  const remainder = path.slice(endOfPathIndex);

  // Replace consecutive trailing slashes with a single slash
  pathPart = pathPart.replace(/\/+$/, '/');

  // Strip trailing slash only if it is not the root path "/"
  if (pathPart !== '/' && pathPart.endsWith('/')) {
    pathPart = pathPart.slice(0, -1);
  }

  // Ensure root path remains as "/" and is not stripped to empty string
  if (pathPart === '') {
    pathPart = '/';
  }

  return `${pathPart}${remainder}`;
};

export const getSanitizedPath = (path: string): string => {
  const cacheKey = path || '';
  if (sanitizedPathCache.has(cacheKey)) {
    return sanitizedPathCache.get(cacheKey)!;
  }

  let cleanPath = path || '/';
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  const subdomainMatch = cleanPath.match(/^\/_subdomain\/[^\/]+(.*)$/);
  if (subdomainMatch) {
    cleanPath = subdomainMatch[1] || '/';
  } else if (cleanPath.startsWith('/_subdomain')) {
    cleanPath = '/';
  }
  
  const result = normalizeTrailingSlashes(cleanPath);
  sanitizedPathCache.set(cacheKey, result);
  return result;
};

export const resolvePublicUrl = (path: string): string => {
  const domain = getPublicDomain();
  const cacheKey = `${domain}::${path}`;
  if (publicUrlCache.has(cacheKey)) {
    return publicUrlCache.get(cacheKey)!;
  }

  const resolvedDomain = resolveDomainForPath(path);
  let cleanPath = getSanitizedPath(path);
  
  if (cleanPath !== '/' && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  
  const finalPath = cleanPath === '/' ? '' : cleanPath;
  const result = `${resolvedDomain}${finalPath}`;
  publicUrlCache.set(cacheKey, result);
  return result;
};

export const resolveImageUrl = (imageConfig: string | undefined, _path: string): string => {
  const domain = getPublicDomain();
  let imageUrl = `${domain}/og-image.png`;

  if (imageConfig) {
      if (imageConfig.startsWith('http')) {
          imageUrl = imageConfig;
      } else if (imageConfig.startsWith('/')) {
          imageUrl = `${domain}${imageConfig}`;
      } else {
          imageUrl = `${domain}/${imageConfig}`;
      }
  }
  return imageUrl;
};

export const formatPathName = (segment: string): string => {
  // Dictionary for specific overrides
  const overrides: Record<string, string> = {
    'wifi-qr-code': 'WiFi QR Code',
    'about': 'About',
    'audio-qr': 'Audio QR',
    'destroy-the-qr': 'Destroy the QR',
    'game': 'QR Damage Simulator Game',
    'security': 'Security & Privacy',
  };

  if (overrides[segment]) {
    return overrides[segment];
  }

  // Default: Capitalize each word (replace dashes with spaces)
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const compileBreadcrumbSchema = (path: string): any | null => {
  if (!path) return null;

  // Determine the base path to correctly resolve the home URL for domains and subdomains
  const subdomainMatch = path.match(/^\/_subdomain\/[^\/]+/);
  const basePath = subdomainMatch ? subdomainMatch[0] : '/';

  const resolvedDomain = resolveDomainForPath(path);

  const breadcrumbItems: any[] = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": resolvePublicUrl(basePath)
    }
  ];

  // Dynamically generate breadcrumbs from path
  const sanitizedPath = getSanitizedPath(path);
  const pathSegments = sanitizedPath.split('/').filter(Boolean);
  let currentPath = '';

  pathSegments.forEach((segment: string, index: number) => {
    currentPath += `/${segment}`;
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": index + 2, // 1 is Home, so start at 2
      "name": formatPathName(segment),
      "item": `${resolvedDomain}${currentPath}`
    });
  });

  if (breadcrumbItems.length < 2) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  };
};

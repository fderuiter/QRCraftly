export const getPublicDomain = (): string => {
  const domain = import.meta.env.VITE_DOMAIN || 'https://qrcraftly.com';
  return domain.replace(/\/+$/, '');
};

export const resolveDomainForPath = (path: string): string => {
  const domain = getPublicDomain();
  if (!path) return domain;
  
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
      return `${url.protocol}//${url.host}`;
    } catch (_e) {
      // Fallback
    }
  }
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
  
  return normalizeTrailingSlashes(cleanPath);
};

export const resolvePublicUrl = (path: string): string => {
  const resolvedDomain = resolveDomainForPath(path);
  let cleanPath = getSanitizedPath(path);
  
  if (cleanPath !== '/' && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  
  const finalPath = cleanPath === '/' ? '' : cleanPath;
  return `${resolvedDomain}${finalPath}`;
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

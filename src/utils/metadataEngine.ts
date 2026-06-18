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
    } catch (e) {
      // Fallback
    }
  }
  return domain;
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
  
  return cleanPath;
};

export const resolvePublicUrl = (path: string): string => {
  const resolvedDomain = resolveDomainForPath(path);
  let cleanPath = getSanitizedPath(path);
  
  // Ensure the path has a trailing slash for consistency with routing
  if (!cleanPath.endsWith('/')) {
    cleanPath += '/';
  }
  
  return `${resolvedDomain}${cleanPath}`;
};

export const resolveImageUrl = (imageConfig: string | undefined, path: string): string => {
  const domain = resolveDomainForPath(path);
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

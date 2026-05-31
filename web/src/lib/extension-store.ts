'use client';

const DEFAULT_CHROME_EXTENSION_URL = 'https://chromewebstore.google.com';
const DEFAULT_EDGE_EXTENSION_URL = 'https://microsoftedge.microsoft.com/addons';

export function getBrowserExtensionInstallUrl(userAgent = '') {
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_EXTENSION_URL || DEFAULT_EDGE_EXTENSION_URL;
  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || DEFAULT_CHROME_EXTENSION_URL;

  return userAgent.includes('Edg/') ? edgeUrl : chromeUrl;
}

export function useBrowserExtensionInstallUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_CHROME_EXTENSION_URL;
  }

  return getBrowserExtensionInstallUrl(window.navigator.userAgent);
}

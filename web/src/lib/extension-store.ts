'use client';

const DEFAULT_CHROME_EXTENSION_URL = 'https://chromewebstore.google.com';
const DEFAULT_EDGE_EXTENSION_URL = 'https://microsoftedge.microsoft.com/addons';

export type ExtensionInstallBrowser = 'edge' | 'chrome';

export function getBrowserExtensionInstallTarget(userAgent = '') {
  const browser: ExtensionInstallBrowser = userAgent.includes('Edg/') ? 'edge' : 'chrome';
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_EXTENSION_URL || DEFAULT_EDGE_EXTENSION_URL;
  const chromeUrl = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || DEFAULT_CHROME_EXTENSION_URL;

  return {
    browser,
    url: browser === 'edge' ? edgeUrl : chromeUrl,
  };
}

export function getBrowserExtensionInstallUrl(userAgent = '') {
  return getBrowserExtensionInstallTarget(userAgent).url;
}

export function useBrowserExtensionInstallUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_CHROME_EXTENSION_URL;
  }

  return getBrowserExtensionInstallUrl(window.navigator.userAgent);
}

export function useBrowserExtensionInstallTarget() {
  if (typeof window === 'undefined') {
    return {
      browser: 'chrome' as const,
      url: DEFAULT_CHROME_EXTENSION_URL,
    };
  }

  return getBrowserExtensionInstallTarget(window.navigator.userAgent);
}

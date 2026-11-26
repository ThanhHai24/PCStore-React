import DOMPurify from 'dompurify';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/**
 * Escapes plain-text values before interpolating them into HTML template strings
 * (e.g. printable documents written with window.document.write).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/**
 * Sanitizes rich HTML content (e.g. SunEditor product descriptions) to prevent Stored XSS.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Validates that a URL uses a safe protocol (relative path, hash, http, https, mailto, tel).
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Returns the URL if it uses a safe protocol; otherwise returns the fallback.
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  return isSafeUrl(url) ? url!.trim() : fallback;
}

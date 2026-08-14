import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Only allows safe formatting tags for car descriptions.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'li', 'ol', 'span'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize plain text (strip all HTML tags).
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

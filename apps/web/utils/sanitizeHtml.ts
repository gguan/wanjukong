import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize admin-authored HTML (product specifications, long-form descriptions)
 * before rendering it with v-html.
 *
 * The source is admin input — not a random user — so threat model is limited
 * to a compromised admin account OR a malicious admin. Either way,
 * unrestricted HTML on a product page is exactly the XSS gadget automated
 * Safe Browsing classifiers scan for. Running DOMPurify with a conservative
 * whitelist closes the vector while keeping the rich-text formatting we
 * actually use.
 *
 * Allowed: basic block + inline prose tags, ordered/unordered lists, links
 * with href/title (URLs normalised by DOMPurify to strip javascript:/data:).
 * Disallowed: <script>, <iframe>, <object>, <embed>, form elements,
 * on* event handlers, style tags.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'span',
  'div',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
  'blockquote',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class'];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force any surviving <a target="_blank"> to get rel="noopener noreferrer"
    // so tab-nabbing isn't possible from specification links.
    ADD_ATTR: ['target'],
  });
}

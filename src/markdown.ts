import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Treat all markdown as untrusted. Convert to HTML, then sanitize to prevent XSS.

const ALLOWED_TAGS: sanitizeHtml.IOptions["allowedTags"] = [
  "p", "br",
  "strong", "em", "del",
  "code", "pre",
  "blockquote",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "hr",
  "a",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "rel", "target"],
  code: ["class"],
};

export function renderMarkdown(md: unknown): string {
  const src = typeof md === "string" ? md : "";
  const raw = marked.parse(src) as string;

  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    // Drop images by default (privacy/tracking).
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        // Prevent target=_blank tabnabbing and avoid leaking referrers.
        const rel = "noopener noreferrer nofollow";
        const target = href.startsWith("/") ? undefined : "_blank";
        return {
          tagName,
          attribs: {
            ...attribs,
            rel,
            ...(target ? { target } : {}),
          },
        };
      },
    },
  });
}

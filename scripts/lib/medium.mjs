/**
 * Shared by inspect-medium-export.mjs and import-medium-export.mjs.
 *
 * One place because the two once measured the same thing against different strings
 * and got different answers. One function, one answer.
 */

export function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '…').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

/* Everything from a Responses / comment heading onward is not the article. */
export function dropTrailingSections(html) {
  const CUTS = [
    /<h[1-4][^>]*>\s*(?:Responses?|Comments?)\s*(?:\(\d+\))?\s*<\/h[1-4]>/i,
    /<section[^>]*(?:responses|comments)[^>]*>/i,
    /<div[^>]*class="[^"]*(?:responses|comment)[^"]*"/i,
    /<h[1-4][^>]*>\s*(?:More from|Recommended from Medium|Written by)\s*/i,
  ];
  let out = html;
  for (const re of CUTS) {
    const m = out.match(re);
    if (m && m.index > 200) out = out.slice(0, m.index);
  }
  return out;
}

const FURNITURE = [
  // Medium stamps this on every exported file. Left in, it became the `close`
  // segment of all 256 documents and every close-shape measurement was reading it.
  /^\s*Exported from Medium on .*$/gim,
  /^\s*This story was originally published.*$/gim,
  /Press enter or click to view image in full size/gi,
  /^\s*Photo by .+ on Unsplash\s*$/gim,
  /^\s*Source:.*$/gim,
  /^\s*Screenshot by author\s*$/gim,
  /^\s*\d+\s*$/gm,
  /^\s*\d+ min read\s*$/gim,
  /^\s*·\s*$/gm,
];

export function htmlToText(html) {
  let s = dropTrailingSections(html);

  s = s.replace(/<head[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<div class="[^"]*(?:author|byline|postMeta)[^"]*"[\s\S]*?<\/div>/gi, '');
  s = s.replace(/<figcaption[\s\S]*?<\/figcaption>/gi, '');
  s = s.replace(/<img[^>]*>/gi, '');

  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => '\n```\n' + code + '\n```\n');
  s = s.replace(/<\/(p|h1|h2|h3|h4|li|blockquote|pre|div|section)>/gi, '\n\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '- ');
  s = s.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  s = s.replace(/<[^>]+>/g, '');

  s = decodeEntities(s);
  for (const pat of FURNITURE) s = s.replace(pat, '');

  // Medium's publication/category tag arrives as a lone ALL-CAPS line.
  s = s.replace(/^[A-Z][A-Z0-9 ,:&'\-()]{6,}$/gm, '');

  s = s.replace(/[ \t]+$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();

  // The export repeats the title: once from <title>/head, once as the <h1>.
  // Left in, it becomes the "first sentence" and corrupts hook measurement.
  const lines = s.split('\n\n');
  const seen = new Set();
  const deduped = [];
  for (let i = 0; i < lines.length; i++) {
    const key = lines[i].trim().toLowerCase().replace(/\W+/g, ' ').trim();
    if (i < 6 && key.length > 15 && seen.has(key)) continue;   // early repeats only
    seen.add(key);
    deduped.push(lines[i]);
  }
  return deduped.join('\n\n').trim() + '\n';
}

export function titleOf(html, filename = '') {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) {
    const t = decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim();
    if (t) return t;
  }
  const t2 = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t2) {
    const t = decodeEntities(t2[1].replace(/<[^>]+>/g, '')).trim();
    if (t) return t;
  }
  return filename.replace(/\.html$/, '');
}

const norm = (s) => s.toLowerCase().replace(/\W+/g, ' ').trim();

/**
 * REPORTED ONLY, not a discriminator — see classify(). A response has no title, so
 * Medium builds one from the opening words and it reappears in the body.
 * Length is deliberately NOT consulted: 137–3,166 words, real articles at the short end.
 * true = response, false = article, null = cannot tell.
 */
export function titleDuplicatesBody(html) {
  const title = norm(titleOf(html)).slice(0, 40);
  if (title.length < 12) return null;

  const withoutH1 = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  const body = norm(htmlToText(withoutH1));
  if (!body) return null;

  return body.startsWith(title.slice(0, Math.min(30, title.length)));
}

/**
 * Count real content images. Medium's export wraps them in <figure>, and a
 * <figure> can hold several <img> plus a caption, so figures are the safer unit.
 */
export function imageCount(html) {
  const body = dropTrailingSections(html);
  const figures = (body.match(/<figure/gi) || []).length;
  if (figures) return figures;
  return (body.match(/<img\b/gi) || []).length;
}

/**
 * DISCRIMINATOR: at least one image -> article. The author's own domain knowledge,
 * which beat four attempts to infer it from markup — all four are written up in
 * CLAUDE.md, Lessons Learned, under the distribution note.
 * Misfiles a response that quotes an image, and an article published without one.
 */
export function classify(html, filename, opts = {}) {
  const minImages = opts.minImages ?? 1;
  const text = htmlToText(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  const images = imageCount(html);

  if (/^draft_/i.test(filename)) {
    return { kind: 'draft', why: ['draft_ prefix — never enters a public repo'], words, images, text };
  }

  if (images < minImages) {
    return {
      kind: 'response',
      why: [`${images} image${images === 1 ? '' : 's'} — under the ${minImages} threshold`],
      words, images, text,
    };
  }

  const why = [`${images} image${images === 1 ? '' : 's'}`];
  if (words < 250) why.push(`short (${words} words) — length is not a signal`);
  return { kind: 'article', why, words, images, text };
}

/** Medium names export files YYYY-MM-DD_Title-hash.html. The date is the only
 *  reliable publication timestamp available, and it is required for any
 *  diachronic analysis. Dropping it was a real loss. */
export function dateOf(filename) {
  const m = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Coarse genre from structure. Not authoritative — a hint the annotation layer
 *  refines. Genre matters more than register for comparison: a listicle and a
 *  personal essay are different rhetorical objects. */
export function genreHint(html, text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const h3 = (html.match(/<h3/gi) || []).length;
  const li = (html.match(/<li[ >]/gi) || []).length;
  const pre = (html.match(/<pre/gi) || []).length;
  const numberedTitle = /^\s*\d+\s/.test(text);

  if (words < 400) return 'micro';
  if (pre >= 2) return 'technical-deep-dive';
  if (numberedTitle || (li >= 8 && h3 >= 4)) return 'listicle';
  if (h3 >= 5 && pre === 0) return 'explainer';
  return 'essay';
}

export const slug = (t) => t.toLowerCase()
  .replace(/[’'"“”]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 60);

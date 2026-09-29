import fs from "node:fs/promises";
import path from "node:path";

export type PageData = {
  meta: { title: string; description: string };
  copy: Record<string, string>;
  media: Record<string, { src: string; srcset?: string; sizes?: string; replacement?: string | null; alt: string }>;
  links: Record<string, string>;
  form: Record<string, string>;
};

export type PageManifest = {
  id: string;
  label: string;
  route: string;
  html: { lang: string; wfDomain: string; wfPage: string; wfSite: string };
  headStyles: string[];
};

const root = process.cwd();
const escText = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const escAttr = (value: unknown) => escText(value).replaceAll('"', "&quot;");


export type MailSettings = {
  subject: string;
  body: string;
};

const CONTACT_EMAIL = "naiadestattoo@gmail.com";

const MAIL_LINK_KEYS_BY_PAGE: Record<string, string[]> = {
  accueil: ["link007", "link019"],
  apropos: ["link007", "link016"],
  "articles__arrhes-et-paiement": ["link007", "link015"],
  "articles__demande-projet": ["link007", "link015"],
  "articles__deroulement-seance": ["link007", "link015"],
  "articles__le-sport-apres-un-tatouage": ["link007", "link015"],
  "articles__les-soins-tatouage-couleur": ["link007", "link016"],
  "articles__les-soins-tatouage-noir": ["link007", "link015"],
  "blog__guerir-grace-au-tatouage": ["link007", "link015"],
  "blog__tatouage-et-consentement": ["link007", "link015"],
  "blog__tatouage-pas-de-compromis": ["link007", "link015"],
  contact: ["link007", "link014"],
  faq: ["link007", "link023"],
  index: ["link007", "link019"],
};

export function buildContactMailto(settings: MailSettings) {
  return "mailto:" + CONTACT_EMAIL
    + "?subject=" + encodeURIComponent(settings.subject || "")
    + "&body=" + encodeURIComponent(settings.body || "");
}

export async function getMailSettings(): Promise<MailSettings> {
  return JSON.parse(await fs.readFile(path.join(root, "src/content/mail-settings.json"), "utf8"));
}


export function withBasePath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const configuredBase = import.meta.env.BASE_URL || "/";
  const base = configuredBase.replace(/\/$/, "");
  if (!base || base === "/" || value === base || value.startsWith(base + "/")) return value;
  return base + value;
}

export function prefixLocalHtml(html: string) {
  const configuredBase = import.meta.env.BASE_URL || "/";
  const base = configuredBase.replace(/\/$/, "");
  if (!base || base === "/") return html;

  const attrRe = /(\b(?:href|src|data-src|action|poster)=["'])\/(?!\/)/g;
  html = html.replace(attrRe, "$1" + base + "/");
  html = html.replace(/(\bsrcset=["'])([^"']*)(["'])/g, (_match, open, value, close) => {
    const prefixed = String(value).split(",").map((part) => {
      const trimmed = part.trim();
      if (!trimmed.startsWith("/") || trimmed.startsWith(base + "/")) return part;
      const leading = part.slice(0, part.indexOf(trimmed));
      return leading + base + trimmed;
    }).join(",");
    return open + prefixed + close;
  });
  return html;
}

export async function hasSourcePage(id: string) {
  try {
    await fs.access(path.join(root, "src/templates/pages", `${id}.html`));
    return true;
  } catch {
    return false;
  }
}

export async function loadSourcePage(id: string) {
  const [template, dataRaw, manifestRaw, mailSettings] = await Promise.all([
    fs.readFile(path.join(root, "src/templates/pages", `${id}.html`), "utf8"),
    fs.readFile(path.join(root, "src/content/pages", `${id}.json`), "utf8"),
    fs.readFile(path.join(root, "src/content/page-manifests", `${id}.json`), "utf8"),
    getMailSettings(),
  ]);
  const data = JSON.parse(dataRaw) as PageData;
  const manifest = JSON.parse(manifestRaw) as PageManifest;
  let html = template;
  for (const [key, value] of Object.entries(data.copy || {})) {
    html = html.replaceAll(`__KS_COPY_${key}__`, escText(value));
  }
  for (const [key, value] of Object.entries(data.media || {})) {
    html = html.replaceAll(`__KS_MEDIA_${key}_SRC__`, escAttr(value.replacement || value.src));
    html = html.replaceAll(`__KS_MEDIA_${key}_ALT__`, escAttr(value.alt));
    html = html.replaceAll(`__KS_MEDIA_${key}_SRCSET__`, escAttr(value.replacement ? "" : (value.srcset || "")));
    html = html.replaceAll(`__KS_MEDIA_${key}_SIZES__`, escAttr(value.replacement ? "" : (value.sizes || "")));
  }
  const contactMailto = buildContactMailto(mailSettings);
  for (const [key, value] of Object.entries(data.links || {})) {
    const renderedValue = value.startsWith("mailto:" + CONTACT_EMAIL) ? contactMailto : value;
    html = html.replaceAll(`__KS_LINK_${key}__`, escAttr(renderedValue));
  }
  for (const key of MAIL_LINK_KEYS_BY_PAGE[id] || []) {
    html = html.replaceAll(`__KS_LINK_${key}__`, escAttr(contactMailto));
  }
  for (const [key, value] of Object.entries(data.form || {})) {
    html = html.replaceAll(`__KS_FORM_${key}__`, escAttr(value));
  }
  return { html, data, manifest };
}

export async function getArticlesSettings() {
  return JSON.parse(await fs.readFile(path.join(root, "src/content/articles-settings.json"), "utf8"));
}

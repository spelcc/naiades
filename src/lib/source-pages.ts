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


export function withBasePath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const configuredBase = process.env.DEPLOY_TARGET === "github-pages"
    ? "/naiades"
    : (import.meta.env.BASE_URL || "/");
  const base = configuredBase.replace(/\/$/, "");
  if (!base || base === "/" || value === base || value.startsWith(base + "/")) return value;
  return base + value;
}

export function prefixLocalHtml(html: string) {
  const configuredBase = process.env.DEPLOY_TARGET === "github-pages"
    ? "/naiades"
    : (import.meta.env.BASE_URL || "/");
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
  const [template, dataRaw, manifestRaw] = await Promise.all([
    fs.readFile(path.join(root, "src/templates/pages", `${id}.html`), "utf8"),
    fs.readFile(path.join(root, "src/content/pages", `${id}.json`), "utf8"),
    fs.readFile(path.join(root, "src/content/page-manifests", `${id}.json`), "utf8"),
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
  for (const [key, value] of Object.entries(data.links || {})) {
    html = html.replaceAll(`__KS_LINK_${key}__`, escAttr(value));
  }
  for (const [key, value] of Object.entries(data.form || {})) {
    html = html.replaceAll(`__KS_FORM_${key}__`, escAttr(value));
  }
  return { html, data, manifest };
}

export async function getArticlesSettings() {
  return JSON.parse(await fs.readFile(path.join(root, "src/content/articles-settings.json"), "utf8"));
}

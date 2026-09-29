import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const root = process.cwd();
const htmlDir = path.join(root, "reference/html");
const files = (await fs.readdir(htmlDir)).filter(f => f.endsWith(".html") && f !== "portfolio.html").sort();
const labels = {
  index: "Accueil",
  accueil: "Accueil (alias /accueil)",
  apropos: "À propos",
  faq: "FAQ",
  contact: "Contact",
};
const routeFor = id => id === "index" ? "/" : "/" + id.replaceAll("__", "/");
const safeText = value => value.replace(/\s+/g, " ").trim();

for (const file of files) {
  const id = file.slice(0, -5).replace(/[^a-zA-Z0-9_\-]/g, "_");
  const html = await fs.readFile(path.join(htmlDir, file), "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });
  const title = $("title").text().trim();
  const description = $("meta[name=description]").attr("content") || "";
  const htmlEl = $("html");
  const pageMeta = {
    id,
    label: labels[id] || (id.startsWith("articles__") ? `Article · ${id.slice(10).replaceAll("-", " ")}` : id.startsWith("blog__") ? `Blog · ${id.slice(6).replaceAll("-", " ")}` : id),
    route: routeFor(id),
    html: {
      lang: htmlEl.attr("lang") || "fr",
      wfDomain: htmlEl.attr("data-wf-domain") || "www.naiadestattoo.com",
      wfPage: htmlEl.attr("data-wf-page") || "",
      wfSite: htmlEl.attr("data-wf-site") || "66dee17e962b82764bf195ef",
    },
    headStyles: $("head style").map((_, el) => $(el).html() || "").get(),
    fields: { copy: {}, media: {}, links: {}, form: {} },
  };
  const data = { meta: { title, description }, copy: {}, media: {}, links: {}, form: {} };

  let ti = 0, ii = 0, li = 0, fi = 0;
  $("body").find("*").contents().filter(function () {
    return this.type === "text" && safeText(this.data || "") && !["script", "style", "svg", "path"].includes((this.parent?.name || "").toLowerCase());
  }).each((_, node) => {
    const parent = node.parent;
    if (!parent) return;
    const raw = node.data || "";
    const trimmed = raw.trim();
    if (!trimmed) return;
    const prefix = raw.slice(0, raw.indexOf(trimmed));
    const suffix = raw.slice(raw.indexOf(trimmed) + trimmed.length);
    const key = `t${String(++ti).padStart(3, "0")}`;
    const parentEl = $(parent);
    const context = `${parent.name || "text"}${parentEl.attr("class") ? "." + parentEl.attr("class").split(/\s+/).slice(0,2).join(".") : ""}`;
    data.copy[key] = trimmed;
    pageMeta.fields.copy[key] = `${context} · ${safeText(trimmed).slice(0, 72)}`;
    node.data = `${prefix}__KS_COPY_${key}__${suffix}`;
  });

  $("body img[src]").each((_, el) => {
    const key = `img${String(++ii).padStart(3, "0")}`;
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    const srcset = $(el).attr("srcset") || "";
    const sizes = $(el).attr("sizes") || "";
    const cls = $(el).attr("class") || "image";
    data.media[key] = { src, alt, srcset, sizes };
    pageMeta.fields.media[key] = `${cls.split(/\s+/).slice(0,2).join(".")} · ${alt || path.basename(new URL(src, "https://www.naiadestattoo.com").pathname).slice(0,64)}`;
    $(el).attr("src", `__KS_MEDIA_${key}_SRC__`).attr("alt", `__KS_MEDIA_${key}_ALT__`);
    if (srcset) $(el).attr("srcset", `__KS_MEDIA_${key}_SRCSET__`);
    if (sizes) $(el).attr("sizes", `__KS_MEDIA_${key}_SIZES__`);
  });

  $("body a[href]").each((_, el) => {
    const key = `link${String(++li).padStart(3, "0")}`;
    const href = $(el).attr("href") || "";
    const txt = safeText($(el).text()).slice(0,64);
    data.links[key] = href;
    pageMeta.fields.links[key] = `${txt || $(el).attr("class") || "Lien"} → ${href.slice(0,80)}`;
    $(el).attr("href", `__KS_LINK_${key}__`);
  });

  $("body input[placeholder], body textarea[placeholder]").each((_, el) => {
    const key = `placeholder${String(++fi).padStart(3, "0")}`;
    const value = $(el).attr("placeholder") || "";
    data.form[key] = value;
    pageMeta.fields.form[key] = `${el.tagName || "field"} · ${value.slice(0,72)}`;
    $(el).attr("placeholder", `__KS_FORM_${key}__`);
  });

  const bodyHtml = $("body").html() || "";
  await fs.writeFile(path.join(root, "src/templates/pages", `${id}.html`), bodyHtml);
  await fs.writeFile(path.join(root, "src/content/pages", `${id}.json`), JSON.stringify(data, null, 2) + "\n");
  await fs.writeFile(path.join(root, "src/content/page-manifests", `${id}.json`), JSON.stringify(pageMeta, null, 2) + "\n");
  console.log(id, pageMeta.route, `copy=${ti}`, `images=${ii}`, `links=${li}`, `form=${fi}`);
}

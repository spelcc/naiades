import fs from "node:fs/promises";
import path from "node:path";
import TurndownService from "turndown";
import * as cheerio from "cheerio";

const root = process.cwd();
const pageDir = path.join(root, "src/content/pages");
const outDir = path.join(root, "src/content/articles");
await fs.mkdir(outDir, { recursive: true });

const ids = (await fs.readdir(pageDir))
  .filter((file) => /^(articles__|blog__).*\.json$/.test(file))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
});
turndown.keep(["u"]);

const escJson = (value) => JSON.stringify(value ?? "");
const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

for (const id of ids) {
  const data = JSON.parse(await fs.readFile(path.join(pageDir, `${id}.json`), "utf8"));
  const routeGroup = id.startsWith("blog__") ? "blog" : "articles";
  const slug = id.replace(/^(articles__|blog__)/, "");
  const route = `/${routeGroup}/${slug}`;
  const response = await fetch(`http://127.0.0.1:4321${route}`);
  if (!response.ok) throw new Error(`${route}: ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  const visibleTitle = clean($("h1.uui-heading-large").first().text()) || data.meta.title;
  const body = $(".uui-text-rich-text.w-richtext").first();
  const firstParagraph = clean(body.find("p").first().text());
  const markdown = turndown.turndown(body.html() || "").trim() + "\n";

  const title = routeGroup === "blog" ? data.meta.title : visibleTitle;
  const frontmatter = {
    title,
    displayTitle: visibleTitle,
    routeGroup,
    seoTitle: data.meta.title,
    seoDescription: data.meta.description || "",
    excerpt: firstParagraph,
    legacySourceId: id,
  };

  const mdoc = `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${markdown}`;
  await fs.writeFile(path.join(outDir, `${slug}.mdoc`), mdoc, "utf8");
  console.log(`${route} -> src/content/articles/${slug}.mdoc`);
}

const oldPostsDir = path.join(root, "src/content/posts");
try {
  const existing = (await fs.readdir(oldPostsDir)).filter((file) => file.endsWith(".mdoc"));
  for (const file of existing) {
    const target = path.join(outDir, file);
    try {
      await fs.access(target);
      console.log(`skip existing ${file}: target already exists`);
    } catch {
      let raw = await fs.readFile(path.join(oldPostsDir, file), "utf8");
      if (!/"routeGroup"\s*:/.test(raw)) {
        raw = raw.replace(/\{\n/, '{\n  "routeGroup": "articles",\n');
      }
      if (!/"displayTitle"\s*:/.test(raw)) {
        const match = raw.match(/"title"\s*:\s*"([^"]*)"/);
        const title = match?.[1] || file.replace(/\.mdoc$/, "");
        raw = raw.replace(/\{\n/, `{\n  "displayTitle": ${escJson(title)},\n`);
      }
      await fs.writeFile(target, raw, "utf8");
      console.log(`preserved ${file}`);
    }
  }
} catch {}

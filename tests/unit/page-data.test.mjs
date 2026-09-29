import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestsDir = path.join(root, "src/content/page-manifests");
const pagesDir = path.join(root, "src/content/pages");
const templatesDir = path.join(root, "src/templates/pages");

const files = (await fs.readdir(manifestsDir)).filter((file) => file.endsWith(".json")).sort();

test("all 14 public source pages are migrated", () => {
  assert.equal(files.length, 14);
});

for (const file of files) {
  const id = file.replace(/\.json$/, "");
  test(`${id}: page data covers every template placeholder`, async () => {
    const [manifestRaw, dataRaw, template] = await Promise.all([
      fs.readFile(path.join(manifestsDir, file), "utf8"),
      fs.readFile(path.join(pagesDir, file), "utf8"),
      fs.readFile(path.join(templatesDir, `${id}.html`), "utf8"),
    ]);
    const manifest = JSON.parse(manifestRaw);
    const data = JSON.parse(dataRaw);

    for (const [group, prefix] of [
      ["copy", "KS_COPY"],
      ["links", "KS_LINK"],
      ["form", "KS_FORM"],
    ]) {
      for (const key of Object.keys(data[group] || {})) {
        assert.match(template, new RegExp(`__${prefix}_${key}__`));
      }
      const dataKeys = Object.keys(data[group] || {}).filter((key) => {
        if (group !== "links") return true;
        return !String(data.links[key] || "").startsWith("mailto:naiadestattoo@gmail.com");
      }).sort();
      assert.deepEqual(dataKeys, Object.keys(manifest.fields[group] || {}).sort());
    }

    for (const key of Object.keys(data.media || {})) {
      assert.match(template, new RegExp(`__KS_MEDIA_${key}_SRC__`));
      assert.match(template, new RegExp(`__KS_MEDIA_${key}_ALT__`));
    }
    assert.deepEqual(Object.keys(data.media || {}).sort(), Object.keys(manifest.fields.media || {}).sort());
  });
}

test("legacy articles and blogs are migrated into the Articles collection", async () => {
  const articleDir = path.join(root, "src/content/articles");
  const entries = (await fs.readdir(articleDir)).filter((file) => file.endsWith(".mdoc"));
  assert.equal(entries.length, 9);

  const config = await fs.readFile(path.join(root, "keystatic.config.ts"), "utf8");
  assert.match(config, /label: "Articles"/);
  assert.match(config, /path: "src\/content\/articles\/\*"/);
  assert.match(config, /!manifest\.id\.startsWith\("articles__"\)/);
  assert.match(config, /!manifest\.id\.startsWith\("blog__"\)/);
  assert.doesNotMatch(config, /routeGroup/);

  for (const file of entries) {
    const content = await fs.readFile(path.join(articleDir, file), "utf8");
    assert.doesNotMatch(content, /"routeGroup"/);
  }
});


test("Mail singleton owns every contact mailto subject and body", async () => {
  const [config, mailRaw] = await Promise.all([
    fs.readFile(path.join(root, "keystatic.config.ts"), "utf8"),
    fs.readFile(path.join(root, "src/content/mail-settings.json"), "utf8"),
  ]);
  const mail = JSON.parse(mailRaw);

  assert.match(config, /mailSettings: singleton/);
  assert.match(config, /label: "Mail"/);
  assert.match(config, /subject: fields\.text\(\{ label: "Objet" \}\)/);
  assert.match(config, /body: fields\.text\(\{ label: "Corps du mail", multiline: true \}\)/);
  assert.equal(mail.subject, "Demande de renseignement");
  assert.match(mail.body, /Hello Naïades,/);

  const renderer = await fs.readFile(path.join(root, "src/lib/source-pages.ts"), "utf8");
  assert.match(renderer, /MAIL_LINK_KEYS_BY_PAGE/);

  for (const file of files) {
    const data = JSON.parse(await fs.readFile(path.join(pagesDir, file), "utf8"));
    const mailLinks = Object.values(data.links || {}).filter((value) =>
      String(value).startsWith("mailto:naiadestattoo@gmail.com")
    );
    assert.equal(mailLinks.length, 0);
  }
});

test("homepage workflow CTA links are editable in Keystatic", async () => {
  for (const id of ["index", "accueil"]) {
    const [manifest, data] = await Promise.all([
      fs.readFile(path.join(manifestsDir, id + ".json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(pagesDir, id + ".json"), "utf8").then(JSON.parse),
    ]);
    for (const key of ["link030", "link031", "link032"]) {
      assert.ok(manifest.fields.links[key]);
      assert.ok(data.links[key]);
    }
  }
});

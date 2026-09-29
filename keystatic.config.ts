import { pageManifests } from "./src/generated/page-manifests";
import { collection, config, fields, singleton } from "@keystatic/core";

const githubStorage = import.meta.env.PUBLIC_KEYSTATIC_STORAGE === "github";
const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO;
if (githubStorage && !githubRepo) {
  throw new Error("PUBLIC_KEYSTATIC_GITHUB_REPO=owner/repo is required in GitHub mode");
}

type Manifest = {
  id: string;
  label: string;
  fields: {
    copy: Record<string, string>;
    media: Record<string, string>;
    links: Record<string, string>;
    form: Record<string, string>;
  };
};

const manifests = (pageManifests as Manifest[]).slice().sort((a, b) => a.label.localeCompare(b.label, "fr"));

const pageSingletons = Object.fromEntries(manifests
  .filter((manifest) => manifest.id !== "faq" && !manifest.id.startsWith("articles__") && !manifest.id.startsWith("blog__"))
  .map((manifest) => {
  const key = `page_${manifest.id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const copy = Object.fromEntries(Object.entries(manifest.fields.copy).map(([fieldKey, label]) => [
    fieldKey,
    fields.text({ label, multiline: true }),
  ]));
  const media = Object.fromEntries(Object.entries(manifest.fields.media).map(([fieldKey, label]) => [
    fieldKey,
    fields.object({
      src: fields.text({ label: "URL source" }),
      srcset: fields.text({ label: "srcset source (avancé)" }),
      sizes: fields.text({ label: "sizes source (avancé)" }),
      replacement: fields.image({
        label: "Remplacer par une image",
        directory: `public/uploads/pages/${manifest.id}`,
        publicPath: `/uploads/pages/${manifest.id}/`,
      }),
      alt: fields.text({ label: "Texte alternatif" }),
    }, { label }),
  ]));
  const links = Object.fromEntries(Object.entries(manifest.fields.links).map(([fieldKey, label]) => [
    fieldKey,
    fields.text({ label }),
  ]));
  const form = Object.fromEntries(Object.entries(manifest.fields.form).map(([fieldKey, label]) => [
    fieldKey,
    fields.text({ label }),
  ]));

  return [key, singleton({
    label: manifest.label,
    path: `src/content/pages/${manifest.id}`,
    format: { data: "json" },
    schema: {
      meta: fields.object({
        title: fields.text({ label: "Titre SEO" }),
        description: fields.text({ label: "Meta description", multiline: true }),
      }, { label: "SEO" }),
      copy: fields.object(copy, { label: "Textes de la page" }),
      media: fields.object(media, { label: "Images" }),
      links: fields.object(links, { label: "Liens" }),
      form: fields.object(form, { label: "Formulaire" }),
    },
  })];
}));

export default config({
  storage: githubStorage && githubRepo ? { kind: "github", repo: githubRepo } : { kind: "local" },
  ui: { brand: { name: "Naïades Tattoo" } },
  singletons: {
    mailSettings: singleton({
      label: "Mail",
      path: "src/content/mail-settings",
      format: { data: "json" },
      schema: {
        subject: fields.text({ label: "Objet" }),
        body: fields.text({ label: "Corps du mail", multiline: true }),
      },
    }),
    articlesSettings: singleton({
      label: "Articles · réglages",
      path: "src/content/articles-settings",
      format: { data: "json" },
      schema: {
        navLabel: fields.text({ label: "Libellé dans le menu" }),
        title: fields.text({ label: "Titre de la page Articles" }),
        intro: fields.text({ label: "Introduction", multiline: true }),
      },
    }),
    ...pageSingletons,
  },
  collections: {
    faq: collection({
      label: "FAQ",
      path: "src/content/faq/*",
      slugField: "question",
      format: { data: "json", contentField: "answer" },
      entryLayout: "content",
      schema: {
        question: fields.slug({ name: { label: "Question" } }),
        section: fields.text({ label: "Section", defaultValue: "Général" }),
        order: fields.integer({ label: "Ordre", defaultValue: 1 }),
        answer: fields.markdoc({ label: "Réponse" }),
      },
    }),
    articles: collection({
      label: "Articles",
      path: "src/content/articles/*",
      slugField: "title",
      format: { data: "json", contentField: "content" },
      entryLayout: "content",
      schema: {
        title: fields.slug({ name: { label: "Titre" } }),
        displayTitle: fields.text({ label: "Titre affiché" }),
        status: fields.select({
          label: "Statut",
          options: [
            { label: "Brouillon", value: "draft" },
            { label: "Publié", value: "published" },
          ],
          defaultValue: "draft",
          description: "Un brouillon n’est ni listé ni accessible sur le site public.",
        }),
        publishedAt: fields.date({
          label: "Date de publication",
          defaultValue: { kind: "today" },
          description: "Utilisée pour classer les articles du plus récent au plus ancien.",
        }),
        seoTitle: fields.text({ label: "Titre SEO" }),
        seoDescription: fields.text({ label: "Meta description", multiline: true }),
        excerpt: fields.text({ label: "Résumé", multiline: true }),
        legacySourceId: fields.text({ label: "Source historique (laisser vide pour un nouvel article)" }),
        coverImage: fields.image({
          label: "Image de couverture",
          directory: "public/images/articles",
          publicPath: "/images/articles/",
        }),
        content: fields.markdoc({
          label: "Contenu",
          options: {
            image: {
              directory: "public/images/articles/inline",
              publicPath: "/images/articles/inline/",
            },
          },
        }),
      },
    }),
  },
});

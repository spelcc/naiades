import { mkdirSync, writeFileSync } from 'node:fs';
import { keystaticGithubBlobFallback } from './keystatic-github-blob-fallback.mjs';

/**
 * Keystatic's official Astro integration with one deliberate difference:
 * the API route is our Cloudflare-aware wrapper, so runtime secrets come from
 * `cloudflare:workers` instead of the removed Astro.locals.runtime.env API.
 */
export default function keystaticCloudflare() {
  return {
    name: 'naiades-keystatic-cloudflare',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, config }) => {
        updateConfig({
          server: config.server.host ? {} : { host: '127.0.0.1' },
          vite: {
            plugins: [keystaticGithubBlobFallback(), {
              name: 'irz-keystatic-config',
              resolveId(id) {
                if (id === 'virtual:keystatic-config') {
                  return this.resolve('./keystatic.config', './a');
                }
                return null;
              },
            }],
            optimizeDeps: {
              entries: ['keystatic.config.*', '.astro/keystatic-imports.js'],
            },
          },
        });

        const dotAstroDir = new URL('./.astro/', config.root);
        mkdirSync(dotAstroDir, { recursive: true });
        writeFileSync(
          new URL('keystatic-imports.js', dotAstroDir),
          'import "@keystatic/astro/ui";\nimport "@keystatic/astro/api";\nimport "@keystatic/core/ui";\n',
        );

        injectRoute({
          entrypoint: '@keystatic/astro/internal/keystatic-astro-page.astro',
          pattern: '/keystatic/[...params]',
          prerender: false,
        });
        injectRoute({
          entrypoint: new URL('./src/keystatic-api.js', config.root),
          pattern: '/api/keystatic/[...params]',
          prerender: false,
        });
      },
    },
  };
}

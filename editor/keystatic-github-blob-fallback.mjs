const KEYSTATIC_UI_SUFFIX = '/@keystatic/core/dist/keystatic-core-ui.js';

const ORIGINAL_PRIVATE_BLOB_FETCH = `  const auth = await getAuth(config);
  return fetch(config.storage.kind === 'github' ? \`https://api.github.com/repos/\${serializeRepoConfig(config.storage.repo)}/git/blobs/\${oid}\` : \`\${KEYSTATIC_CLOUD_API_URL}/v1/github/blob/\${oid}\`, {
    headers: {
      Authorization: \`Bearer \${auth.accessToken}\`,
      Accept: 'application/vnd.github.raw',
      ...(config.storage.kind === 'cloud' ? KEYSTATIC_CLOUD_HEADERS : {})
    }
  });`;

const PRIVATE_BLOB_FETCH_WITH_FALLBACK = `  const auth = await getAuth(config);
  const headers = {
    Authorization: \`Bearer \${auth.accessToken}\`,
    Accept: 'application/vnd.github.raw',
    ...(config.storage.kind === 'cloud' ? KEYSTATIC_CLOUD_HEADERS : {})
  };
  if (config.storage.kind === 'github') {
    const blobResponse = await fetch(\`https://api.github.com/repos/\${serializeRepoConfig(config.storage.repo)}/git/blobs/\${oid}\`, { headers });
    if (blobResponse.status !== 403) return blobResponse;

    const pathPrefix = getPathPrefix(config.storage) ?? '';
    const encodedPath = \`\${pathPrefix}\${filepath}\`.split('/').map(encodeURIComponent).join('/');
    return fetch(\`https://api.github.com/repos/\${serializeRepoConfig(config.storage.repo)}/contents/\${encodedPath}?ref=\${encodeURIComponent(commitSha)}\`, { headers });
  }
  return fetch(\`\${KEYSTATIC_CLOUD_API_URL}/v1/github/blob/\${oid}\`, { headers });`;

export function patchKeystaticGithubBlobSource(code, id) {
  const normalizedId = id.split('?', 1)[0].replaceAll('\\', '/');
  if (!normalizedId.endsWith(KEYSTATIC_UI_SUFFIX)) return null;
  if (!code.includes(ORIGINAL_PRIVATE_BLOB_FETCH)) {
    throw new Error('Keystatic private blob fetch changed upstream; review the IRZ GitHub blob fallback');
  }
  return code.replace(ORIGINAL_PRIVATE_BLOB_FETCH, PRIVATE_BLOB_FETCH_WITH_FALLBACK);
}

export function keystaticGithubBlobFallback() {
  return {
    name: 'irz-keystatic-github-blob-fallback',
    enforce: 'pre',
    transform(code, id) {
      return patchKeystaticGithubBlobSource(code, id);
    },
  };
}

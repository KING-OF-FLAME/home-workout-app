// Lets Node run the app's TypeScript data files directly: maps "@/x" to src/x.ts
// and adds the .ts extension to relative imports. Used by validate-data.
import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!globalThis.__tsResolveRegistered) {
  globalThis.__tsResolveRegistered = true;
  register(import.meta.url);
}

const src = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, next) {
  let url;
  if (specifier.startsWith('@/')) url = new URL(specifier.slice(2), src);
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.includes('/src/')) url = new URL(specifier, context.parentURL);
  if (url) {
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
      const candidate = new URL(url.href + ext);
      const p = fileURLToPath(candidate);
      if (ext === '' && !/\.(ts|tsx|mjs|js|json)$/.test(p)) continue;
      if (existsSync(p)) return next(pathToFileURL(p).href, context);
    }
  }
  return next(specifier, context);
}

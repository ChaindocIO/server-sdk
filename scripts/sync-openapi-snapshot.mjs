import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Source of the public contract: first CLI argument, then CHAINDOC_PUBLIC_OPENAPI_PATH,
// then the sibling backend checkout (`../backend`).
const defaultSourcePath = path.resolve(
  process.cwd(),
  '..',
  'backend',
  'openapi',
  'public-api.json',
);
const explicit = process.argv[2] ?? process.env.CHAINDOC_PUBLIC_OPENAPI_PATH;
const sourcePath = explicit ? path.resolve(explicit) : defaultSourcePath;
const targetPath = path.resolve(process.cwd(), 'references', 'public-api.snapshot.json');

if (!existsSync(sourcePath)) {
  console.error(`Public OpenAPI snapshot source not found: ${sourcePath}`);
  console.error(
    'Pass the path as an argument, set CHAINDOC_PUBLIC_OPENAPI_PATH, or run `pnpm export:openapi:public` in the sibling backend repo first.',
  );
  process.exit(1);
}

mkdirSync(path.dirname(targetPath), { recursive: true });
copyFileSync(sourcePath, targetPath);

console.log(`Synced backend OpenAPI snapshot from ${sourcePath}`);
console.log(`Updated ${targetPath}`);

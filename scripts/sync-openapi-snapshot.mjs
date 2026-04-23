import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const defaultSourcePath = path.resolve(
  process.cwd(),
  '..',
  'chaindoc-backend',
  'openapi',
  'public-api.json',
);
const sourcePath = process.env.CHAINDOC_PUBLIC_OPENAPI_PATH
  ? path.resolve(process.env.CHAINDOC_PUBLIC_OPENAPI_PATH)
  : defaultSourcePath;
const targetPath = path.resolve(process.cwd(), 'references', 'public-api.snapshot.json');

if (!existsSync(sourcePath)) {
  console.error(`Public OpenAPI snapshot source not found: ${sourcePath}`);
  console.error(
    'Set CHAINDOC_PUBLIC_OPENAPI_PATH or run `pnpm export:openapi:public` in the sibling backend repo first.',
  );
  process.exit(1);
}

mkdirSync(path.dirname(targetPath), { recursive: true });
copyFileSync(sourcePath, targetPath);

console.log(`Synced backend OpenAPI snapshot from ${sourcePath}`);
console.log(`Updated ${targetPath}`);

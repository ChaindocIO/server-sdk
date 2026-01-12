import { defineConfig } from 'tsup';
import { config } from 'dotenv';

config();

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  splitting: false,
  target: 'node18',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  define: {
    'process.env.CHAINDOC_API_PRODUCTION': JSON.stringify(process.env.CHAINDOC_API_PRODUCTION),
    'process.env.CHAINDOC_API_STAGING': JSON.stringify(process.env.CHAINDOC_API_STAGING),
    'process.env.CHAINDOC_API_DEVELOPMENT': JSON.stringify(process.env.CHAINDOC_API_DEVELOPMENT),
  },
});

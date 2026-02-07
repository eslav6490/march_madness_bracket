import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src')
    }
  }
});

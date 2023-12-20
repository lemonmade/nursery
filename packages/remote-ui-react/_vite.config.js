import {defineConfig} from 'vite';
import {quiltPackage} from '@quilted/craft/vite';

export default defineConfig({
  plugins: [
    quiltPackage({
      react: 'react',
    }),
  ],
});

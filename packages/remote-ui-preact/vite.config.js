import {defineConfig} from 'vite';
import {quiltPackage} from '@quilted/craft/vite';

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  plugins: [quiltPackage()],
});

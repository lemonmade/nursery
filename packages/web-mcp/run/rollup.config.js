import {quiltModule} from '@quilted/rollup/module';

export default quiltModule({
  entry: {
    client: './source/client.ts',
    server: './source/server.ts',
  },
  assets: {
    minify: true,
  }
});

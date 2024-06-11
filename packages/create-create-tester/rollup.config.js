import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  executable: {'create-tester': './source/index.ts'},
});

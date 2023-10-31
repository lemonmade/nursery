import {quiltPackage} from '@quilted/craft/rollup';

export default quiltPackage({
  executable: {'create-tester': './source/index.ts'},
});

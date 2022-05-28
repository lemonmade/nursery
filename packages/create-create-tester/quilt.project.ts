import {createPackage, quiltPackage} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.binary({name: 'create-tester', entry: './source/index.ts'});
  pkg.use(quiltPackage());
});

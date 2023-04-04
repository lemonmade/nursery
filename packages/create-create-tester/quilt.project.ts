import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      executable: {'create-tester': './source/index.ts'},
    }),
  );
});

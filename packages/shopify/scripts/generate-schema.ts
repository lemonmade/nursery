import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {printSchema} from 'graphql';
import {fetchGraphQLSchema} from '../source/graphql.ts';
import {
  createStorefrontGraphQLFetch,
  type APIVersion,
} from '../source/storefront.ts';

const shop = process.env.SHOP;
const apiVersion = process.env.API_VERSION as APIVersion;
const accessToken = process.env.ACCESS_TOKEN;

const missing: string[] = [];
if (shop == null) missing.push('SHOP');
if (apiVersion == null) missing.push('API_VERSION');
if (accessToken == null) missing.push('ACCESS_TOKEN');

if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
}

const fetch = createStorefrontGraphQLFetch({
  shop,
  apiVersion,
  accessToken,
});

const schema = await fetchGraphQLSchema({fetch});

const file = path.resolve(`./graphql/${apiVersion}/storefront.schema.graphql`);
await fs.mkdir(path.dirname(file), {recursive: true});

await fs.writeFile(file, printSchema(schema) + '\n');

const SHOPIFY_HOST = 'shopify';
const INCORRECT_PATHNAME_PREFIX = '//shopify';

/**
 * An object representing a parsed Shopify GID. These GIDs, in the
 * format `gid://shopify/Resource/123`, are used to uniquely identify
 * resources in many Shopify APIs. This class extracts both the `resource`
 * and the `id` parts from the GID.
 *
 * Because the GID format is a valid URL, this class extends the `URL`
 * constructor. This means that you also have access to properties available
 * on the `URL` object. Most notably, `searchParams` provides a `URLSearchParams`
 * instance, which are sometimes used to pass additional parameters in Shopify
 * GIDs.
 *
 * @see https://shopify.dev/docs/api/usage/gids
 */
export class ShopifyGID extends URL {
  /**
   * The legacy resource ID, parsed from the GID. If you are parsing a GID
   * retrieved from GraphQL just to get this value, you should consider querying
   * the [`legacyResourceId`](https://shopify.dev/docs/api/admin-graphql/latest/interfaces/LegacyInteroperability)
   * field instead, if it is defined on the resource.
   *
   * Even if the value is a number, it will be returned as a string. Typically,
   * this value will be an unsigned, 64-bit integer, which can be safely parsed
   * using the JavaScript [`BigInt` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt).
   *
   * @example '123'
   */
  readonly id: string;

  /**
   * The name of the resource, parsed from the GID.
   *
   * @example 'Product'
   */
  readonly resource: string;

  constructor(readonly gid: string) {
    super(gid);

    const [, resource, parsedId] = this.pathname.split('/');

    this.id = parsedId!;
    this.resource = resource!;
  }

  // Browsers have inconsistent parsing of the Shopify GID format,
  // `gid://shopify/Resource/123`. These getters ensure that the
  // inconsistent properties are normalized.
  get hostname() {
    return SHOPIFY_HOST;
  }

  get host() {
    return SHOPIFY_HOST;
  }

  get pathname() {
    const pathname = super.pathname;

    return pathname.startsWith(INCORRECT_PATHNAME_PREFIX)
      ? pathname.slice(INCORRECT_PATHNAME_PREFIX.length)
      : pathname;
  }
}

export function parseId(id: string): ShopifyGID {
  return new ShopifyGID(id);
}

const SHOPIFY_HOST = 'shopify';
const GID_PREFIX = 'gid://shopify/';
const INCORRECT_PATHNAME_PREFIX = '//shopify';

export interface ShopifyGIDDetails {
  /**
   * The legacy resource ID for the object being identified.
   */
  readonly id: string | number;

  /**
   * The name of the resource that represents the type of object being identified.
   */
  readonly resource: string;
}

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
 * GIDs. However, unlike `URL` objects, only the `searchParams` part is mutable.
 *
 * @see https://shopify.dev/docs/api/usage/gids
 */
export class ShopifyGID extends URL implements ShopifyGIDDetails {
  /**
   * Creates a GID from the details that are serialized in a GID.
   */
  static from({id, resource}: ShopifyGIDDetails) {
    return new ShopifyGID(`${GID_PREFIX}${resource}/${id}`);
  }

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

  /**
   * The original GID.
   */
  get gid() {
    return this.href;
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

  constructor(gid: string) {
    const [resource, id] = gid.slice(GID_PREFIX.length).split('/');

    super(gid);

    this.id = id!;
    this.resource = resource!;
  }
}

export function parseGID(gid: string): ShopifyGID {
  return new ShopifyGID(gid);
}

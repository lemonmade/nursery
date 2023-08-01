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
  readonly id: string;
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

/**
 * @see https://shopify.dev/docs/api/usage/authentication
 */
export type StorefrontAccessToken =
  | {
      /**
       * A client-side public access token.
       * @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-public-access
       */
      readonly access?: 'public';
      readonly token: string;
      readonly buyerIP?: never;
    }
  | {
      /**
       * A server-side authenticated access token.
       * @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-authenticated-access
       */
      readonly access: 'authenticated' | 'private';
      readonly token: string;
      readonly buyerIP?: string;
    };

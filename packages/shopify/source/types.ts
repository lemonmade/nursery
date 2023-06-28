export type SupportedApiVersion =
  | 'unstable'
  | '2023-04'
  | '2023-01'
  | '2022-10'
  | '2022-07';
export type ApiVersion = 'unstable' | `${number}-${'01' | '04' | '07' | '10'}`;

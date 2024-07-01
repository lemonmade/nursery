export type UnstableAPIVersion = 'unstable';

export type ReleaseCandidateAPIVersion = '2024-07';

export type SupportedAPIVersion = '2024-04' | '2024-01' | '2023-10' | '2023-07';

export type APIVersion =
  | UnstableAPIVersion
  | ReleaseCandidateAPIVersion
  | SupportedAPIVersion
  | '2023-04'
  | '2023-01'
  | '2022-10'
  | '2022-07'
  | '2022-04'
  | '2022-01'
  | '2021-10'
  | '2021-07'
  | '2021-04'
  | '2021-01'
  | '2020-10'
  | '2020-07'
  | '2020-04'
  | '2020-01'
  | '2019-10'
  | '2019-07'
  | '2019-04'
  | '2019-01';

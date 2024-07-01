import type {APIVersion} from '../types.ts';

const API_VERSIONS_BY_QUARTER = ['01', '04', '07', '10'];

export function getLatestAPIVersion() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return `${year}-${
    API_VERSIONS_BY_QUARTER[Math.floor(month / 3)]
  }` as APIVersion;
}

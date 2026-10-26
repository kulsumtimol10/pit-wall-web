import type { DataIndex, SessionFile } from './data-types';

/** Base URL of the published data, e.g. https://<user>.github.io/pit-wall-data/v1 */
export const DATA_URL = (import.meta.env.VITE_DATA_URL ?? '').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  if (!DATA_URL) throw new Error('VITE_DATA_URL is not set');
  const url = `${DATA_URL}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

export const fetchIndex = () => getJson<DataIndex>('index.json');

export const fetchSession = (file: string) => getJson<SessionFile>(file);

import { DATA_VERSION, type DataIndex, type LapData, type LapFile, type SessionFile } from './data-types';

/**
 * Where the published data lives, e.g. https://<user>.github.io/pit-wall-data.
 * A version folder at the end of VITE_DATA_URL (".../v1" in older settings) is
 * ignored: the site reads the version its copy of the format describes.
 */
const BASE_URL = (import.meta.env.VITE_DATA_URL ?? '').replace(/\/$/, '').replace(/\/v\d+$/, '');
export const DATA_URL = BASE_URL && `${BASE_URL}/v${DATA_VERSION}`;

/** Requests by URL, so going back to a race or driver doesn't download it again. */
const requests = new Map<string, Promise<unknown>>();

function getJson<T>(path: string): Promise<T> {
  if (!DATA_URL) return Promise.reject(new Error('VITE_DATA_URL is not set'));
  const url = `${DATA_URL}/${path}`;
  const cached = requests.get(url) as Promise<T> | undefined;
  if (cached) return cached;
  const request = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  });
  // A failed request is tried again next time.
  request.catch(() => requests.delete(url));
  requests.set(url, request);
  return request;
}

export const fetchIndex = () => getJson<DataIndex>('index.json');

export const fetchSession = (file: string) => getJson<SessionFile>(file);

export const fetchLap = (file: string): Promise<LapData> => getJson<LapFile>(file).then((f) => f.lap);

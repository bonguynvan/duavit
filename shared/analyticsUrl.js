// What a page view reports to analytics: never host keys, room codes or anything after "?" / "#".

const ROOM_PATH = /^\/r\/[A-Za-z0-9]{4,12}(?=\/|$)/;

/** Page address with the query, hash and room code stripped: /r/ABC123/host?key=… -> /r/:code/host */
export function cleanLocation(href) {
  const url = new URL(href);
  return `${url.origin}${url.pathname.replace(ROOM_PATH, '/r/:code')}`;
}

/** GA4 measurement ids look like G-XXXXXXXXXX. */
export const isGa4Id = (value) => typeof value === 'string' && /^G-[A-Z0-9]{4,16}$/.test(value);

export interface Coords {
  lat: number;
  lng: number;
}

/** City centroids for US freight hubs in seed + sample call data */
const US_CITIES: Record<string, Coords> = {
  "atlanta,ga": { lat: 33.749, lng: -84.388 },
  "boston,ma": { lat: 42.3601, lng: -71.0589 },
  "charlotte,nc": { lat: 35.2271, lng: -80.8431 },
  "chicago,il": { lat: 41.8781, lng: -87.6298 },
  "dallas,tx": { lat: 32.7767, lng: -96.797 },
  "denver,co": { lat: 39.7392, lng: -104.9903 },
  "detroit,mi": { lat: 42.3314, lng: -83.0458 },
  "houston,tx": { lat: 29.7604, lng: -95.3698 },
  "indianapolis,in": { lat: 39.7684, lng: -86.1581 },
  "kansas city,mo": { lat: 39.0997, lng: -94.5786 },
  "las vegas,nv": { lat: 36.1699, lng: -115.1398 },
  "los angeles,ca": { lat: 34.0522, lng: -118.2437 },
  "memphis,tn": { lat: 35.1495, lng: -90.049 },
  "miami,fl": { lat: 25.7617, lng: -80.1918 },
  "nashville,tn": { lat: 36.1627, lng: -86.7816 },
  "new orleans,la": { lat: 29.9511, lng: -90.0715 },
  "new york,ny": { lat: 40.7128, lng: -74.006 },
  "omaha,ne": { lat: 41.2565, lng: -95.9345 },
  "philadelphia,pa": { lat: 39.9526, lng: -75.1652 },
  "phoenix,az": { lat: 33.4484, lng: -112.074 },
  "portland,or": { lat: 45.5152, lng: -122.6784 },
  "salt lake city,ut": { lat: 40.7608, lng: -111.891 },
  "san francisco,ca": { lat: 37.7749, lng: -122.4194 },
  "seattle,wa": { lat: 47.6062, lng: -122.3321 },
  "st. louis,mo": { lat: 38.627, lng: -90.1994 },
  "st louis,mo": { lat: 38.627, lng: -90.1994 },
};

const STATE_ABBREV: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

export function parseLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "";

  const commaIdx = trimmed.lastIndexOf(",");
  if (commaIdx === -1) {
    return trimmed.toLowerCase().replace(/\s+/g, " ");
  }

  const city = trimmed.slice(0, commaIdx).trim().toLowerCase().replace(/\s+/g, " ");
  const statePart = trimmed.slice(commaIdx + 1).trim().toLowerCase();

  let state = statePart;
  if (state.length > 2) {
    state = STATE_ABBREV[state] ?? state.slice(0, 2);
  }

  return `${city},${state}`;
}

export function geocodeLocation(location: string): Coords | null {
  const key = parseLocation(location);
  if (!key) return null;
  return US_CITIES[key] ?? null;
}

export function geocodeLane(
  origin: string,
  destination: string,
): { origin_coords: [number, number]; dest_coords: [number, number]; geocoded: true } | { geocoded: false } {
  const originCoords = geocodeLocation(origin);
  const destCoords = geocodeLocation(destination);
  if (!originCoords || !destCoords) {
    return { geocoded: false };
  }
  return {
    origin_coords: [originCoords.lat, originCoords.lng],
    dest_coords: [destCoords.lat, destCoords.lng],
    geocoded: true,
  };
}

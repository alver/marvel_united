// assets.ts — which scanned images exist (public/img/manifest.json, written by
// tools/build-assets.mjs). Components fall back to CSS rendering for anything
// that is not in the manifest, so the game works with no images at all.

const BASE = import.meta.env.BASE_URL + 'img/';
let files = new Set<string>();
let loaded = false;

export async function loadManifest(): Promise<void> {
  try {
    const r = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
    if (r.ok) {
      const m = (await r.json()) as { files: string[] };
      files = new Set(m.files);
    }
  } catch {
    /* no scans available */
  }
  loaded = true;
}
export function assetsLoaded() {
  return loaded;
}
export function has(rel: string): boolean {
  return files.has(rel);
}
export function url(rel: string): string {
  return BASE + rel;
}
// Returns the URL when the asset exists, otherwise null.
export function img(rel: string): string | null {
  return files.has(rel) ? BASE + rel : null;
}

export const A = {
  card: (id: string) => `cards/${id}.webp`,
  threat: (id: string) => `threats/${id}.webp`,
  heroBack: (hero: string) => `backs/hero-${hero}.webp`,
  planBack: (villain: string) => `backs/plan-${villain}.webp`,
  threatBack: (villain: string) => `backs/threat-${villain}.webp`,
  location: (id: string) => `locations/${id}.webp`,
  locationBack: () => 'backs/location.webp',
  dashboard: (villain: string) => `dashboards/${villain}.webp`,
  dashboardBack: (villain: string) => `dashboards/${villain}-back.webp`,
  mission: (key: string) => `missions/${key}.webp`,
  challenge: (id: string) => `missions/${id}.webp`,
  token: (name: string) => `tokens/${name}.webp`,
  figure: (id: string) => `figures/${id}.webp`,
};

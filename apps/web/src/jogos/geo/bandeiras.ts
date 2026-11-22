/* Bandeiras do flag-icons (MIT), formato 4:3, copiadas para packages/geo/bandeiras. */
const urls = import.meta.glob('../../../../../packages/geo/bandeiras/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const porIso = new Map(Object.entries(urls).map(([k, v]) => [k.split('/').pop()!.replace('.svg', ''), v]));
export const bandeira = (iso2: string) => porIso.get(iso2) ?? '';

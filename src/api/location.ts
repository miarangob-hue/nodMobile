export type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  city: string;
  comuna: string;
  latitude?: number;
  longitude?: number;
};

export async function searchChileanAddresses(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "6");
  url.searchParams.set("lat", "-33.4489");
  url.searchParams.set("lon", "-70.6693");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("No se pudieron buscar direcciones.");

  const body = await response.json() as { features?: Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> }> };
  const suggestions = (body.features ?? []).map((feature, index) => {
    const p = feature.properties ?? {};
    const street = String(p.street ?? p.name ?? "");
    const number = String(p.housenumber ?? "");
    const comuna = String(p.district ?? p.city ?? p.county ?? "");
    const rawCity = String(p.city ?? "");
    const county = String(p.county ?? "");
    const state = String(p.state ?? "");
    const city = getChileanCity({ comuna, county, rawCity, state });
    const address = [street, number].filter(Boolean).join(" ");
    const label = [address, comuna, city].filter((value, position, values) => value && values.indexOf(value) === position).join(", ");
    return {
      id: String(p.osm_id ?? `${index}-${label}`),
      label,
      address: address || label,
      comuna,
      city,
      longitude: feature.geometry?.coordinates?.[0],
      latitude: feature.geometry?.coordinates?.[1]
    };
  }).filter((item) => item.label);

  const unique = new Map<string, AddressSuggestion>();
  suggestions.forEach((suggestion) => {
    const key = [suggestion.address, suggestion.comuna, suggestion.city]
      .map((value) => value.trim().toLocaleLowerCase("es"))
      .join("|");
    if (!unique.has(key)) unique.set(key, suggestion);
  });
  return [...unique.values()];
}

function getChileanCity({ comuna, county, rawCity, state }: { comuna: string; county: string; rawCity: string; state: string }) {
  const differsFromComuna = (value: string) => value && value.toLocaleLowerCase("es") !== comuna.toLocaleLowerCase("es");
  if (differsFromComuna(rawCity)) return rawCity;
  if (differsFromComuna(county) && !/provincia|regi[oó]n/i.test(county)) return county;
  if (/metropolitana|santiago/i.test(state)) return "Santiago";
  return differsFromComuna(county) ? county.replace(/^Provincia de\s+/i, "") : rawCity || comuna;
}

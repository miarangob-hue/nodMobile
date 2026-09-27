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
  return (body.features ?? []).map((feature, index) => {
    const p = feature.properties ?? {};
    const street = String(p.street ?? p.name ?? "");
    const number = String(p.housenumber ?? "");
    const comuna = String(p.district ?? p.city ?? p.county ?? "");
    const city = String(p.city ?? p.county ?? p.state ?? "");
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
}

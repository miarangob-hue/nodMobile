export async function getDogBreeds() {
  const response = await fetch("https://dog.ceo/api/breeds/list/all");
  if (!response.ok) throw new Error("No se pudo cargar el catálogo de razas.");
  const body = await response.json() as { message?: Record<string, string[]> };

  return Object.entries(body.message ?? {}).flatMap(([breed, subBreeds]) =>
    subBreeds.length
      ? subBreeds.map((subBreed) => formatBreed(`${subBreed} ${breed}`))
      : [formatBreed(breed)]
  ).sort((left, right) => left.localeCompare(right, "es"));
}

function formatBreed(value: string) {
  return value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

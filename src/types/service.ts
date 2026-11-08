export type CustomerService = "pet" | "home" | "housing" | "community";

export const customerServices: Array<{
  id: CustomerService;
  title: string;
  description: string;
  icon: "heart" | "home" | "moon" | "users";
  color: string;
}> = [
  {
    id: "pet",
    title: "Servicios para mascotas",
    description: "Paseos, cuidadores, veterinaria, matches y todo lo que tu mascota necesita.",
    icon: "heart",
    color: "#EE7C2B"
  },
  {
    id: "home",
    title: "Servicios para tu hogar",
    description: "Encuentra profesionales para reparaciones, limpieza y mantención.",
    icon: "home",
    color: "#2F7D5C"
  },
  {
    id: "housing",
    title: "Alojamiento",
    description: "Busca hospedaje confiable para ti y tus mascotas.",
    icon: "moon",
    color: "#4D709E"
  },
  {
    id: "community",
    title: "Comunidad NOD",
    description: "Conecta, descubre lugares y participa con otros miembros de NOD.",
    icon: "users",
    color: "#9B6BC4"
  }
];

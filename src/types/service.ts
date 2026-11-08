export type CustomerService = "pet" | "home";

export const customerServices: Array<{
  id: CustomerService;
  title: string;
  description: string;
  icon: "heart" | "home";
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
  }
];

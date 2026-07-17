export type BusinessSegment = "restaurant" | "food_service" | "services" | "retail" | "other";

const RESTAURANT_MATCHES = [
  "restaurant",
  "restaurante",
  "pizzaria",
  "hamburgueria",
  "sushi",
  "churrascaria",
  "lanchonete",
  "bar",
];

const FOOD_SERVICE_MATCHES = [
  "bakery",
  "padaria",
  "cafe",
  "cafeteria",
  "confeitaria",
  "sorveteria",
  "food",
  "meal",
  "delivery",
];

const RETAIL_MATCHES = ["store", "loja", "retail", "clothing", "roupa", "shop", "mercado"];

const SERVICES_MATCHES = [
  "dentist",
  "clinic",
  "clinica",
  "salon",
  "salao",
  "lawyer",
  "advogado",
  "accounting",
  "contabilidade",
  "gym",
  "academia",
  "repair",
  "servico",
  "service",
];

function includesAny(value: string, matches: string[]): boolean {
  return matches.some((match) => value.includes(match));
}

export function mapCategoriesToSegment(categories: string[] = []): BusinessSegment {
  const normalized = categories.map((category) =>
    category
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
  const text = normalized.join(" ");

  if (includesAny(text, RESTAURANT_MATCHES)) return "restaurant";
  if (includesAny(text, FOOD_SERVICE_MATCHES)) return "food_service";
  if (includesAny(text, RETAIL_MATCHES)) return "retail";
  if (includesAny(text, SERVICES_MATCHES)) return "services";
  return "other";
}

export function isFoodSegment(segment: BusinessSegment | null | undefined): boolean {
  return segment === "restaurant" || segment === "food_service";
}

import { describe, expect, it } from "vitest";
import { mapCategoriesToSegment } from "./segments";

describe("mapCategoriesToSegment", () => {
  it("maps restaurant categories", () => {
    expect(mapCategoriesToSegment(["restaurant", "food", "point_of_interest"])).toBe("restaurant");
    expect(mapCategoriesToSegment(["Pizzaria", "Restaurante italiano"])).toBe("restaurant");
  });

  it("maps food service categories separately from restaurants", () => {
    expect(mapCategoriesToSegment(["bakery", "store"])).toBe("food_service");
    expect(mapCategoriesToSegment(["Cafeteria", "Confeitaria"])).toBe("food_service");
  });

  it("does not classify services as food", () => {
    expect(mapCategoriesToSegment(["dentist", "health"])).toBe("services");
    expect(mapCategoriesToSegment(["Loja de roupas"])).toBe("retail");
    expect(mapCategoriesToSegment(["point_of_interest"])).toBe("other");
  });
});

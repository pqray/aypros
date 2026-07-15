import { describe, expect, it } from "vitest";
import { loginSchema, onboardingSchema, signupSchema } from "./index";

describe("auth validation schemas", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      fullName: "Rayssa Silva",
      email: "rayssa@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(result.success).toBe(true);
  });

  it("rejects signup when password confirmation differs", () => {
    const result = signupSchema.safeParse({
      fullName: "Rayssa Silva",
      email: "rayssa@example.com",
      password: "12345678",
      confirmPassword: "87654321",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid login email", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "12345678",
    });

    expect(result.success).toBe(false);
  });
});

describe("onboarding validation schema", () => {
  it("accepts profile and organization data", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Rayssa Silva",
      organizationName: "Aypros",
      professionalRole: "Agencia",
    });

    expect(result.success).toBe(true);
  });
});

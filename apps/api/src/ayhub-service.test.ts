import { describe, expect, it, vi } from "vitest";
import { findOrCreateAyhubClient, generateSiteKey, hashSiteKey } from "./ayhub-service";

function createAyhubClientsBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  return builder;
}

function createServiceDb(clientsBuilder: ReturnType<typeof createAyhubClientsBuilder>) {
  return {
    schema: vi.fn(() => ({
      from: vi.fn(() => clientsBuilder),
    })),
  };
}

const params = {
  orgId: "org-1",
  leadId: "lead-1",
  businessName: "Padaria Central",
  businessPhone: "+5585999990000",
  suggestedMaintenanceValue: 150,
};

describe("findOrCreateAyhubClient", () => {
  it("reuses the client already linked to this lead (won re-entry)", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle.mockResolvedValueOnce({ data: { id: "client-1" }, error: null });
    const serviceDb = createServiceDb(clients);

    const result = await findOrCreateAyhubClient(serviceDb as never, params);

    expect(result).toEqual({ clientId: "client-1", created: false });
    expect(clients.insert).not.toHaveBeenCalled();
    expect(clients.update).not.toHaveBeenCalled();
  });

  it("reuses a client found by contact and backfills origin_lead_id when it was null", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // by origin_lead_id: not found
      .mockResolvedValueOnce({ data: { id: "client-2", origin_lead_id: null }, error: null }); // by contact
    const serviceDb = createServiceDb(clients);

    const result = await findOrCreateAyhubClient(serviceDb as never, params);

    expect(result).toEqual({ clientId: "client-2", created: false });
    expect(clients.update).toHaveBeenCalledWith({ origin_lead_id: "lead-1" });
    expect(clients.insert).not.toHaveBeenCalled();
  });

  it("does not touch origin_lead_id when the matched client already has one", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "client-3", origin_lead_id: "other-lead" }, error: null });
    const serviceDb = createServiceDb(clients);

    const result = await findOrCreateAyhubClient(serviceDb as never, params);

    expect(result).toEqual({ clientId: "client-3", created: false });
    expect(clients.update).not.toHaveBeenCalled();
  });

  it("creates a new client when nothing matches by origin or contact", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    clients.single.mockResolvedValueOnce({ data: { id: "client-new" }, error: null });
    const serviceDb = createServiceDb(clients);

    const result = await findOrCreateAyhubClient(serviceDb as never, params);

    expect(result).toEqual({ clientId: "client-new", created: true });
    expect(clients.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        name: "Padaria Central",
        contact: "+5585999990000",
        maintenance_value: 150,
        status: "active",
        origin: "pipeline",
        origin_lead_id: "lead-1",
      }),
    );
  });

  it("creates a new client without a contact lookup when the business has no phone", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    clients.single.mockResolvedValueOnce({ data: { id: "client-new" }, error: null });
    const serviceDb = createServiceDb(clients);

    const result = await findOrCreateAyhubClient(serviceDb as never, { ...params, businessPhone: null });

    expect(result).toEqual({ clientId: "client-new", created: true });
    // Only the origin_lead_id lookup ran — no second maybeSingle call for contact.
    expect(clients.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("throws when the insert fails", async () => {
    const clients = createAyhubClientsBuilder();
    clients.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    clients.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const serviceDb = createServiceDb(clients);

    await expect(findOrCreateAyhubClient(serviceDb as never, params)).rejects.toThrow(/boom/);
  });
});

describe("hashSiteKey / generateSiteKey", () => {
  it("hashes deterministically", () => {
    expect(hashSiteKey("same-key")).toBe(hashSiteKey("same-key"));
    expect(hashSiteKey("key-a")).not.toBe(hashSiteKey("key-b"));
  });

  it("generates a plaintext key whose hash matches the returned hash", () => {
    const { plaintext, hash } = generateSiteKey();

    expect(plaintext).toMatch(/^ayh_[0-9a-f]{64}$/);
    expect(hashSiteKey(plaintext)).toBe(hash);
  });

  it("never repeats a generated key", () => {
    const a = generateSiteKey();
    const b = generateSiteKey();

    expect(a.plaintext).not.toBe(b.plaintext);
  });
});

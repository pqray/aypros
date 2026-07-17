import { describe, expect, it } from "vitest";
import { parseHtmlAudit } from "./parser";

describe("parseHtmlAudit", () => {
  it("detects metadata, viewport, platform and social links", () => {
    const result = parseHtmlAudit({
      finalUrl: "https://example.com",
      status: 200,
      html: `
        <html lang="pt-BR">
          <head>
            <title>Clinica Exemplo Fortaleza</title>
            <meta name="description" content="Clinica odontologica em Fortaleza com atendimento completo." />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta property="og:title" content="Clinica Exemplo" />
            <meta name="generator" content="WordPress" />
            <link rel="icon" href="/favicon.ico" />
          </head>
          <body>
            <a href="https://instagram.com/clinica">Instagram</a>
            <a href="https://wa.me/558599999999">WhatsApp</a>
            <footer>2026</footer>
          </body>
        </html>
      `,
    });

    expect(result.detections.hasTitle.state).toBe("detected");
    expect(result.detections.hasDescription.state).toBe("detected");
    expect(result.detections.hasViewport.state).toBe("detected");
    expect(result.detections.platform.evidence).toEqual({ platform: "wordpress" });
    expect(result.detections.socialLinks.state).toBe("detected");
    expect(result.detections.whatsapp.state).toBe("detected");
  });

  it("marks SPA shell content-dependent detections as inconclusive", () => {
    const result = parseHtmlAudit({
      finalUrl: "https://spa.example",
      status: 200,
      html: `
        <html>
          <head><script src="/assets/app.js"></script></head>
          <body><div id="root"></div></body>
        </html>
      `,
    });

    expect(result.detections.hasTitle.state).toBe("inconclusive");
    expect(result.detections.hasDescription.state).toBe("inconclusive");
    expect(result.detections.hasViewport.state).toBe("inconclusive");
    expect(result.evidence.spaShell).toBe(true);
  });

  it("detects outdated footer years", () => {
    const result = parseHtmlAudit({
      finalUrl: "https://old.example",
      status: 200,
      html: `
        <html>
          <head><title>Site antigo exemplo</title><meta name="description" content="Descricao suficiente para teste." /></head>
          <body><footer>Copyright 2018</footer></body>
        </html>
      `,
    });

    expect(result.detections.outdated.state).toBe("detected");
  });
});

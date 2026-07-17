import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { detectSegmentPlatforms } from "./segment-platforms";

function detect(html: string, finalUrl = "https://restaurante.example") {
  const $ = cheerio.load(html);
  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get();
  return detectSegmentPlatforms({ $, html, finalUrl, links });
}

describe("detectSegmentPlatforms", () => {
  it("detects link-in-bio by final URL with evidence", () => {
    const result = detect("<html><body>Links</body></html>", "https://linktr.ee/restaurante");

    expect(result.linkInBio.state).toBe("detected");
    expect(result.linkInBio.evidence).toMatchObject({ id: "linktree", source: "final_url" });
  });

  it("detects delivery platforms by links and HTML signatures", () => {
    const byLink = detect('<a href="https://www.ifood.com.br/delivery/loja">Pedir</a>');
    const byHtml = detect("<html><body>Pedidos por Anota AI</body></html>");

    expect(byLink.deliveryPlatform.evidence).toMatchObject({ id: "ifood", source: "link" });
    expect(byHtml.deliveryPlatform.evidence).toMatchObject({ id: "anota_ai", source: "html" });
  });

  it("detects menu links without treating unrelated pages as menu", () => {
    expect(detect('<a href="/cardapio">Ver cardapio</a>').menuOnline.state).toBe("detected");
    expect(detect('<a href="/sobre">Sobre a clinica</a>').menuOnline.state).toBe("not_detected");
  });
});

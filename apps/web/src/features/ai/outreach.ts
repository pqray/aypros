const E164_PHONE_RE = /^\+[1-9]\d{7,14}$/;
export const MAX_WHATSAPP_DRAFT_LENGTH = 1200;

export function buildWhatsappUrl(
  phone: string | null | undefined,
  text: string,
  maxLength = MAX_WHATSAPP_DRAFT_LENGTH,
): string | null {
  if (!phone || !E164_PHONE_RE.test(phone)) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  const trimmedText = text.trim();
  if (!trimmedText) {
    return null;
  }

  const boundedText =
    trimmedText.length > maxLength
      ? `${trimmedText.slice(0, Math.max(0, maxLength - 3))}...`
      : trimmedText;

  return `https://wa.me/${digits}?text=${encodeURIComponent(boundedText)}`;
}

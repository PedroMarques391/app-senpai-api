export class StringUtils {
  static escapeHtml(value?: string | null): string {
    if (!value) return "";
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  static stripHtml(value?: string | null): string {
    if (!value) return "";
    return value.replace(/<[^>]*>?/gm, "").trim();
  }
}

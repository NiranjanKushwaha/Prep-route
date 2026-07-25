const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "BR",
  "P",
  "DIV",
  "UL",
  "OL",
  "LI",
  "SPAN",
  "FONT",
]);

const ALLOWED_STYLE_PROPS = new Set(["color", "background-color", "font-size"]);

/** Keep only safe color / size declarations from an inline style string. */
function sanitizeStyle(style: string): string {
  const kept: string[] = [];
  for (const part of style.split(";")) {
    const [rawProp, ...rest] = part.split(":");
    if (!rawProp || rest.length === 0) continue;
    const prop = rawProp.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !value) continue;
    // Block urls / expressions in style values.
    if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) continue;
    if (prop === "font-size" && !/^(\d+(\.\d+)?)(px|em|rem|%)$/i.test(value)) continue;
    if ((prop === "color" || prop === "background-color") && !isSafeColor(value)) continue;
    kept.push(`${prop}: ${value}`);
  }
  return kept.join("; ");
}

function isSafeColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "transparent" || v === "inherit" || v === "currentcolor") return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return true;
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(v)) return true;
  if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|0?\.\d+|1(\.0)?)\s*\)$/i.test(v)) {
    return true;
  }
  // Named CSS colors used by the palette / execCommand.
  if (/^[a-z]+$/i.test(v) && v.length <= 20) return true;
  return false;
}

/** Strip scripts/events and keep a small formatting allowlist for question HTML. */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  if (typeof window === "undefined") {
    return input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/javascript:/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = input;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }

        // FONT color attribute → inline style, then drop the legacy attr.
        if (el.tagName === "FONT") {
          const color = el.getAttribute("color");
          if (color && isSafeColor(color)) {
            el.style.color = color;
          }
          el.removeAttribute("color");
          el.removeAttribute("face");
          el.removeAttribute("size");
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "href" || name === "src") {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name === "style") {
            const safe = sanitizeStyle(attr.value);
            if (safe) el.setAttribute("style", safe);
            else el.removeAttribute("style");
          }
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}

/** Plain-text length used for required-field checks (ignores tags). */
export function plainTextLength(html: string): number {
  if (!html) return 0;
  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length;
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim().length;
}

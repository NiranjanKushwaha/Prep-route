import { sanitizeHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

interface RichTextProps {
  html: string;
  className?: string;
  as?: "p" | "div" | "span";
}

/** Safely render stored question HTML (or plain text) in preview/read views. */
export function RichText({ html, className, as: Tag = "div" }: RichTextProps) {
  const clean = sanitizeHtml(html || "");
  return (
    <Tag
      className={cn(
        "[&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        // Inline color / highlight / size from the editor are kept via sanitized style attrs.
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

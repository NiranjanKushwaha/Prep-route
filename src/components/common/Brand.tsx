import logoSvg from "@/assets/preproute-logo.svg?raw";
import { cn } from "@/lib/utils";

/** Official PrepRoute wordmark from Figma — inlined so light/dark CSS variables apply. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="PrepRoute"
      className={cn(
        "inline-flex h-8 w-[132px] shrink-0 items-center [&>svg]:h-full [&>svg]:w-auto",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}

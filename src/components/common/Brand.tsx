import { Link } from "@tanstack/react-router";
import logoSvg from "@/assets/preproute-logo.svg?raw";
import { ROUTES } from "@/constants/routes.constant";
import { cn } from "@/lib/utils";

/** Official PrepRoute wordmark from Figma — inlined so light/dark CSS variables apply. */
export function Brand({
  className = "",
  to = ROUTES.DASHBOARD,
}: {
  className?: string;
  /** Destination on click. Defaults to the tests listing (dashboard). */
  to?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="PrepRoute — go to tests listing"
      className={cn(
        "inline-flex h-8 w-[132px] shrink-0 items-center outline-none [&>svg]:h-full [&>svg]:w-auto",
        "rounded-sm focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}

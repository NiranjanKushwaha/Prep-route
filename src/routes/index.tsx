import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { STORAGE_KEYS } from "@/constants/common.constant";
import { ROUTES } from "@/constants/routes.constant";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    navigate({ to: token ? ROUTES.DASHBOARD : ROUTES.LOGIN, replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}

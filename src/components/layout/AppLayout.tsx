import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus2, ClipboardList, LogOut, Bell, ChevronDown } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Brand } from "@/components/common/Brand";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes.constant";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  match: "exact" | "tests" | "none";
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { to: ROUTES.CREATE_TEST, label: "Test Creation", icon: FilePlus2, match: "tests" },
  { to: ROUTES.DASHBOARD, label: "Test Tracking", icon: ClipboardList, match: "none" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === ROUTES.DASHBOARD;
  if (item.match === "tests") return pathname.startsWith("/tests");
  return false;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: ROUTES.LOGIN });
    }
  }, [ready, isAuthenticated, navigate]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const displayName = (user?.name as string) || (user?.userId as string) || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/*
        Figma sidebar: white panel, logo block aligned to header height,
        nav with icon + label, active item = soft blue pill rounded on the right.
      */}
      <aside className="hidden md:flex md:w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto py-4 pl-0 pr-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item, i) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={`${item.label}-${i}`}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 py-2.5 pl-5 pr-4 text-sm font-medium transition-colors",
                      // Figma: active = light blue bar with rounded right corners
                      active
                        ? "rounded-r-full bg-primary/10 text-primary"
                        : "rounded-r-full text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => {
              signOut();
              navigate({ to: ROUTES.LOGIN });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 md:px-8">
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-success" />
            </button>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block leading-tight">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {displayName}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {(user?.role as string) || "Admin"}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

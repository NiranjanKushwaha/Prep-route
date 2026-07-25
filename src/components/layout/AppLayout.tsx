import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { TrendingUp, SquarePen, ClipboardList, LogOut, Bell, ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "@/components/common/Brand";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: TrendingUp, match: "exact" },
  { to: ROUTES.CREATE_TEST, label: "Test Creation", icon: SquarePen, match: "tests" },
  { to: ROUTES.DASHBOARD, label: "Test Tracking", icon: ClipboardList, match: "none" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === ROUTES.DASHBOARD;
  if (item.match === "tests") return pathname.startsWith("/tests");
  return false;
}

/** Figma global sidebar: logo block + inset rounded active pill. */
function GlobalSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden md:flex md:w-55 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Brand />
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 pl-0 pr-3">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={`${item.label}-${i}`}>
                <Link
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-3 rounded-r-lg py-2.5 pl-5 pr-4 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {/* Figma: blue indicator bar on the sidebar's left edge for the active item */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-[70%] w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon className={cn("h-4.5 w-4.5", active && "text-primary")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function AppLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  /** Optional custom left sidebar (e.g. the Question Creation navigator). Defaults to the global nav. */
  sidebar?: ReactNode;
}) {
  const { ready, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

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
  const role = (user?.role as string) || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleConfirmSignOut = () => {
    setSignOutOpen(false);
    signOut();
    navigate({ to: ROUTES.LOGIN });
  };

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {sidebar ?? <GlobalSidebar pathname={pathname} />}

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

            <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:bg-muted/70"
                  aria-label="Open profile menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {displayName}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          profileOpen && "rotate-180",
                        )}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-xl border-0 bg-popover p-1.5 shadow-lg outline-none ring-0"
              >
                <DropdownMenuLabel className="px-2.5 py-2">
                  <div className="text-sm font-semibold text-foreground">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setProfileOpen(false);
                    setSignOutOpen(true);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="max-w-95 gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:rounded-2xl [&>button]:hidden">
          <div className="relative overflow-hidden bg-linear-to-br from-accent via-card to-card px-6 pb-5 pt-7">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
              <LogOut className="h-6 w-6" />
            </div>
            <DialogHeader className="relative mt-5 space-y-2 text-center sm:text-center">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Sign out of PrepRoute?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                You&apos;ll need to sign in again to manage tests as{" "}
                <span className="font-medium text-foreground">{displayName}</span>.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/30 px-6 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl border-border bg-card hover:bg-muted"
              onClick={() => setSignOutOpen(false)}
            >
              Stay signed in
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={handleConfirmSignOut}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

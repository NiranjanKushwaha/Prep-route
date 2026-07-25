import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  TrendingUp,
  SquarePen,
  Layers,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Brand } from "@/components/common/Brand";
import { ROUTES } from "@/constants/routes.constant";
import { cn } from "@/lib/utils";

interface QuestionSidebarProps {
  /** Id of the test being edited — used by the icon rail links. */
  testId: string;
  /** Total target number of questions (from the test). */
  total: number;
  /** How many are completed / saved so far. */
  doneCount: number;
  /** Completion state for created slots; incomplete slots remain selectable. */
  questionStates?: boolean[];
  /** Index of the question currently being edited/viewed (optional). */
  activeIndex?: number | null;
  /** Called when a completed question pill is clicked. */
  onSelect?: (index: number) => void;
}

/**
 * Figma "Question creation" dual sidebar: a thin icon rail plus a
 * collapsible navigator listing each question with its completion state.
 */
export function QuestionSidebar({
  testId,
  total,
  doneCount,
  questionStates,
  activeIndex = null,
  onSelect,
}: QuestionSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = Math.max(total, questionStates?.length ?? 0, doneCount, 1);
  const pills = Array.from({ length: count }, (_, i) => i);

  const railItems = [
    { icon: TrendingUp, label: "Dashboard", to: ROUTES.DASHBOARD },
    { icon: SquarePen, label: "Test details", to: ROUTES.EDIT_TEST(testId) },
    { icon: Layers, label: "Questions", to: ROUTES.ADD_QUESTIONS(testId) },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "md:w-16" : "md:w-64",
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
        <Brand className={cn(collapsed && "w-8 overflow-hidden")} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Thin icon rail */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-4 border-r border-sidebar-border py-5">
          {railItems.map(({ icon: Icon, label, to }) => {
            const active = pathname === to;
            return (
              <Link
                key={label}
                to={to}
                title={label}
                aria-label={label}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </Link>
            );
          })}
          {collapsed && (
            <button
              type="button"
              aria-label="Expand navigator"
              onClick={() => setCollapsed(false)}
              className="mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigator panel */}
        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col px-4 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Question creation</h2>
              <button
                type="button"
                aria-label="Collapse navigator"
                onClick={() => setCollapsed(true)}
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-muted-foreground">
              Total Questions{" "}
              <span className="font-medium text-foreground">. {total || count}</span>
            </p>

            <div className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2 pb-4">
              {pills.map((i) => {
                const exists = questionStates ? i < questionStates.length : i < doneCount;
                const done = questionStates?.[i] ?? i < doneCount;
                const active = activeIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!exists}
                    onClick={() => exists && onSelect?.(i)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      done
                        ? "border-success/40 bg-card text-foreground hover:bg-success/5"
                        : exists
                          ? "border-border bg-card text-foreground hover:bg-muted"
                          : "cursor-default border-border bg-muted/40 text-muted-foreground",
                      active && "border-primary/50 bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className="truncate">Question {i + 1}</span>
                    </span>
                    <ChevronsRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        done ? "text-success" : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

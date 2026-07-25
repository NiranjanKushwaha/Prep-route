import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  RemoveFormatting,
  Baseline,
  Highlighter,
  ALargeSmall,
  Check,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { plainTextLength, sanitizeHtml } from "@/lib/sanitize-html";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  "aria-invalid"?: boolean;
}

type MenuName = "color" | "highlight" | "size";

interface ColorOption {
  label: string;
  value: string;
}

/** Text colors — saturated, high-contrast on white and dark themes. */
const TEXT_COLORS: ColorOption[] = [
  { label: "Black", value: "#111827" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Purple", value: "#9333ea" },
];

/** Highlight colors — soft pastels that keep text readable. */
const HIGHLIGHT_COLORS: ColorOption[] = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Lime", value: "#d9f99d" },
  { label: "Mint", value: "#a7f3d0" },
  { label: "Cyan", value: "#a5f3fc" },
  { label: "Sky", value: "#bae6fd" },
  { label: "Lavender", value: "#ddd6fe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Peach", value: "#fed7aa" },
];

const FONT_SIZES = [
  { label: "Small", sample: "Aa", value: "12px" },
  { label: "Normal", sample: "Aa", value: "14px" },
  { label: "Large", sample: "Aa", value: "18px" },
  { label: "Extra large", sample: "Aa", value: "22px" },
];

const INLINE_COMMANDS = ["bold", "italic", "underline"] as const;
const DEFAULT_TEXT_COLOR = "#111827";

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function normalizeEmpty(html: string): string {
  return plainTextLength(html) === 0 ? "" : html;
}

/**
 * Lightweight formatting bar + contentEditable editor.
 * Stores a small HTML subset (bold/italic/underline/lists/colors/sizes) that the
 * API already accepts, and that `RichText` renders back in preview.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type here…",
  className,
  minHeightClassName = "min-h-28",
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);
  const savedRange = useRef<Range | null>(null);
  const focused = useRef(false);

  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const [activeMarks, setActiveMarks] = useState<Record<string, boolean>>({});
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [highlightColor, setHighlightColor] = useState("");

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const toggleMenu = (menu: MenuName) => {
    rememberSelection();
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  // Close palette when clicking anywhere outside the open panel (including
  // the editor text area and other toolbar buttons). Escape also closes.
  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuPanelRef.current?.contains(target)) return;
      const trigger = (target as Element).closest?.("[data-menu-trigger]");
      if (trigger && rootRef.current?.contains(trigger)) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        editorRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [openMenu, closeMenu]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (focused.current) return;

    const domHtml = normalizeEmpty(sanitizeHtml(el.innerHTML));
    const next = value || "";
    if (
      next !== lastEmitted.current ||
      (plainTextLength(next) > 0 && plainTextLength(domHtml) === 0)
    ) {
      el.innerHTML = next;
      lastEmitted.current = next;
    }
  }, [value]);

  const syncActiveMarks = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = editorRef.current;
    const selection = window.getSelection();
    const inside =
      !!el && !!selection && selection.rangeCount > 0 && el.contains(selection.anchorNode);
    if (!inside) return;

    const next: Record<string, boolean> = {};
    for (const command of INLINE_COMMANDS) {
      try {
        next[command] = document.queryCommandState(command);
      } catch {
        next[command] = false;
      }
    }
    setActiveMarks(next);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", syncActiveMarks);
    return () => document.removeEventListener("selectionchange", syncActiveMarks);
  }, [syncActiveMarks]);

  const rememberSelection = () => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    focused.current = true;
    const range = savedRange.current;
    if (!range || !el.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = normalizeEmpty(sanitizeHtml(el.innerHTML));

    if (cleaned === "" && plainTextLength(value) > 0 && !focused.current) {
      el.innerHTML = value;
      return;
    }

    if (cleaned === lastEmitted.current) return;
    lastEmitted.current = cleaned;
    onChange(cleaned);
  };

  const apply = (command: string, commandValue?: string) => {
    restoreSelection();
    runCommand(command, commandValue);
    rememberSelection();
    syncActiveMarks();
    emit();
  };

  const applyTextColor = (color: string) => {
    const next = color || DEFAULT_TEXT_COLOR;
    setTextColor(next);
    closeMenu();
    apply("foreColor", next);
  };

  const applyHighlight = (color: string) => {
    setHighlightColor(color);
    closeMenu();
    restoreSelection();
    const target = color || "transparent";
    try {
      runCommand("hiliteColor", target);
    } catch {
      runCommand("backColor", target);
    }
    rememberSelection();
    emit();
  };

  const applyFontSize = (size: string) => {
    closeMenu();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      runCommand("insertHTML", `<span style="font-size: ${size}">&#8203;</span>`);
    } else {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      selection.removeAllRanges();
      const next = document.createRange();
      next.selectNodeContents(span);
      selection.addRange(next);
    }
    rememberSelection();
    emit();
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm focus-within:border-ring/60",
        ariaInvalid && "border-destructive",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-muted/50 px-2 py-1.5">
        <ToolbarButton label="Bold" active={activeMarks.bold} onClick={() => apply("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={activeMarks.italic} onClick={() => apply("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={activeMarks.underline}
          onClick={() => apply("underline")}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <PaletteMenu
          open={openMenu === "color"}
          panelRef={menuPanelRef}
          onToggle={() => toggleMenu("color")}
          label="Text color"
          title="Text color"
          widthClassName="w-56"
          icon={
            <span className="flex flex-col items-center gap-0.5">
              <Baseline className="h-4 w-4" />
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: textColor || DEFAULT_TEXT_COLOR }}
              />
            </span>
          }
        >
          <ResetRow
            label="Automatic"
            hint="Default text color"
            onPick={() => applyTextColor("")}
            selected={textColor === DEFAULT_TEXT_COLOR}
            preview={
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold text-foreground">
                A
              </span>
            }
          />
          <div className="mt-3 grid grid-cols-5 gap-2.5">
            {TEXT_COLORS.map((c) => (
              <SwatchButton
                key={c.label}
                label={c.label}
                color={c.value}
                selected={textColor === c.value}
                shape="circle"
                onPick={() => applyTextColor(c.value)}
              />
            ))}
          </div>
        </PaletteMenu>

        <PaletteMenu
          open={openMenu === "highlight"}
          panelRef={menuPanelRef}
          onToggle={() => toggleMenu("highlight")}
          label="Highlight"
          title="Highlight"
          widthClassName="w-56"
          icon={
            <span className="relative flex items-center justify-center">
              <Highlighter className="h-4 w-4" />
              {highlightColor ? (
                <span
                  className="absolute -bottom-0.5 left-0.5 h-1 w-3 rounded-full"
                  style={{ backgroundColor: highlightColor }}
                />
              ) : null}
            </span>
          }
        >
          <ResetRow
            label="No highlight"
            hint="Remove background"
            onPick={() => applyHighlight("")}
            selected={!highlightColor}
            preview={
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border bg-background">
                <Ban className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            }
          />
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <SwatchButton
                key={c.label}
                label={c.label}
                color={c.value}
                selected={highlightColor === c.value}
                shape="square"
                onPick={() => applyHighlight(c.value)}
              />
            ))}
          </div>
        </PaletteMenu>

        <PaletteMenu
          open={openMenu === "size"}
          panelRef={menuPanelRef}
          onToggle={() => toggleMenu("size")}
          label="Text size"
          title="Text size"
          widthClassName="w-48"
          icon={<ALargeSmall className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-1">
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-foreground transition hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize(s.value)}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="font-semibold text-muted-foreground" style={{ fontSize: s.value }}>
                  {s.sample}
                </span>
              </button>
            ))}
          </div>
        </PaletteMenu>

        <ToolbarDivider />

        <ToolbarButton label="Bullet list" onClick={() => apply("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => apply("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton label="Clear formatting" onClick={() => apply("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="relative rounded-b-xl bg-background">
        {plainTextLength(value) === 0 && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "max-w-none rounded-b-xl px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            minHeightClassName,
          )}
          onFocus={() => {
            focused.current = true;
          }}
          onInput={() => {
            rememberSelection();
            emit();
          }}
          onKeyUp={rememberSelection}
          onMouseUp={() => {
            rememberSelection();
            if (openMenu) closeMenu();
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef.current?.contains(next)) return;
            focused.current = false;
            emit();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            runCommand("insertText", text);
            emit();
          }}
        />
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
  menuTrigger,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  menuTrigger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-menu-trigger={menuTrigger ? "" : undefined}
      className={cn(
        "h-8 w-8 rounded-lg p-0 text-foreground/80 hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PaletteMenu({
  open,
  onToggle,
  label,
  icon,
  title,
  children,
  panelRef,
  widthClassName = "w-56",
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  panelRef: RefObject<HTMLDivElement | null>;
  widthClassName?: string;
}) {
  return (
    <div className="relative">
      <ToolbarButton label={label} active={open} onClick={onToggle} menuTrigger>
        {icon}
      </ToolbarButton>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className={cn(
            "absolute left-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl",
            "ring-1 ring-black/5 dark:ring-white/10",
            widthClassName,
          )}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="border-b border-border/80 bg-muted/40 px-3.5 py-2.5">
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          </div>
          <div className="p-3.5">{children}</div>
        </div>
      )}
    </div>
  );
}

function ResetRow({
  label,
  hint,
  preview,
  selected,
  onPick,
}: {
  label: string;
  hint: string;
  preview: ReactNode;
  selected?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-background px-2.5 py-2 text-left transition",
        "hover:border-primary/40 hover:bg-accent/60",
        selected && "border-primary/50 bg-accent/70 ring-1 ring-primary/30",
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      {preview}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

function SwatchButton({
  label,
  color,
  onPick,
  selected,
  shape,
}: {
  label: string;
  color: string;
  onPick: () => void;
  selected?: boolean;
  shape: "circle" | "square";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        shape === "circle" ? "rounded-full" : "rounded-lg",
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      <span
        className={cn(
          "absolute inset-0 border border-black/10 shadow-sm transition group-hover:scale-105 group-hover:shadow-md dark:border-white/15",
          shape === "circle" ? "rounded-full" : "rounded-lg",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
        )}
        style={{ backgroundColor: color }}
      />
      {selected ? (
        <Check
          className={cn(
            "relative h-3.5 w-3.5 drop-shadow-sm",
            isLightColor(color) ? "text-foreground" : "text-white",
          )}
        />
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </button>
  );
}

/** Rough luminance check so the checkmark stays readable on any swatch. */
function isLightColor(hex: string): boolean {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return true;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

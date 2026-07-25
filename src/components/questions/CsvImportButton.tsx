import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Question } from "@/interfaces/question.interface";
import { downloadCsvTemplate, parseQuestionsCsv } from "@/lib/csv";

interface CsvImportButtonProps {
  onImport: (questions: Question[]) => void;
}

export function CsvImportButton({ onImport }: CsvImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const result = parseQuestionsCsv(text);
      if (result.questions.length === 0) {
        toast.error(result.errors[0] || "No valid questions found in CSV");
        return;
      }
      onImport(result.questions);
      const extra =
        result.errors.length > 0
          ? ` (${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped)`
          : "";
      toast.success(
        `Imported ${result.questions.length} question${result.questions.length === 1 ? "" : "s"}${extra}`,
      );
      if (result.errors.length) {
        toast.message("Some CSV rows were skipped", {
          description: result.errors.slice(0, 3).join(" · "),
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read CSV");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload CSV
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => downloadCsvTemplate()}
      >
        <Download className="h-4 w-4" />
        Template
      </Button>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        question, options, correct_option…
      </span>
    </div>
  );
}

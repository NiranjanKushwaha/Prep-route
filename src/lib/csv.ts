import type { Question } from "@/interfaces/question.interface";

export const CSV_TEMPLATE_HEADERS = [
  "question",
  "option1",
  "option2",
  "option3",
  "option4",
  "correct_option",
  "explanation",
  "difficulty",
  "media_url",
] as const;

export interface CsvParseResult {
  questions: Question[];
  errors: string[];
  skipped: number;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeCorrectOption(raw: string): Question["correct_option"] | "" {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  if (["option1", "option_1", "a", "1"].includes(value)) return "option1";
  if (["option2", "option_2", "b", "2"].includes(value)) return "option2";
  if (["option3", "option_3", "c", "3"].includes(value)) return "option3";
  if (["option4", "option_4", "d", "4"].includes(value)) return "option4";
  return "";
}

function normalizeDifficulty(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (["easy", "medium", "difficult", "hard"].includes(value)) {
    return value === "hard" ? "difficult" : value;
  }
  return "";
}

/** Parse an MCQ CSV into draft questions. Invalid rows are reported, not thrown. */
export function parseQuestionsCsv(text: string): CsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      questions: [],
      errors: ["CSV must include a header row and at least one data row."],
      skipped: 0,
    };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const indexOf = (name: string) => headers.indexOf(name);

  const required = [
    "question",
    "option1",
    "option2",
    "option3",
    "option4",
    "correct_option",
  ] as const;
  const missing = required.filter((h) => indexOf(h) < 0);
  if (missing.length) {
    return {
      questions: [],
      errors: [`Missing required columns: ${missing.join(", ")}`],
      skipped: 0,
    };
  }

  const questions: Question[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let row = 1; row < lines.length; row++) {
    const cells = splitCsvLine(lines[row]);
    const get = (name: string) => {
      const idx = indexOf(name);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const question = get("question");
    const option1 = get("option1");
    const option2 = get("option2");
    const option3 = get("option3");
    const option4 = get("option4");
    const correct = normalizeCorrectOption(get("correct_option"));
    const explanation = get("explanation");
    const difficulty = normalizeDifficulty(get("difficulty"));
    const media_url = get("media_url");

    if (!question && !option1 && !option2 && !option3 && !option4) {
      skipped += 1;
      continue;
    }

    const rowErrors: string[] = [];
    if (!question) rowErrors.push("question is required");
    if (!option1 || !option2 || !option3 || !option4)
      rowErrors.push("all four options are required");
    if (!correct) rowErrors.push("correct_option must be option1–option4 (or A–D / 1–4)");

    if (rowErrors.length) {
      errors.push(`Row ${row + 1}: ${rowErrors.join("; ")}`);
      skipped += 1;
      continue;
    }

    questions.push({
      type: "mcq",
      question,
      option1,
      option2,
      option3,
      option4,
      correct_option: correct,
      explanation,
      difficulty,
      media_url,
    });
  }

  return { questions, errors, skipped };
}

export function buildCsvTemplate(): string {
  const sample = [
    CSV_TEMPLATE_HEADERS.join(","),
    ['"What is 2 + 2?"', "3", "4", "5", "6", "option2", '"Basic arithmetic"', "easy", ""].join(","),
    ['"Capital of France?"', "Berlin", "Madrid", "Paris", "Rome", "C", "", "medium", ""].join(","),
  ];
  return `${sample.join("\n")}\n`;
}

export function downloadCsvTemplate(filename = "preproute-questions-template.csv") {
  const blob = new Blob([buildCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

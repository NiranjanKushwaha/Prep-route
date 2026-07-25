// Falls back to the staging API so a fresh clone runs without any env setup;
// `.env.production` / `.env.staging` override it per build mode.
const DEFAULT_API_BASE_URL = "https://admin-moderator-backend-staging.up.railway.app/api";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
  /\/$/,
  "",
);

export const STORAGE_KEYS = {
  TOKEN: "preproute_token",
  USER: "preproute_user",
  THEME: "preproute_theme",
} as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "difficult", label: "Difficult" },
] as const;

export const TEST_TYPES = [
  { value: "chapterwise", label: "Chapterwise" },
  { value: "pyq", label: "PYQ" },
  { value: "mock", label: "Mock Test" },
] as const;

export const LIVE_UNTIL_OPTIONS = [
  { value: "always", label: "Always Available" },
  { value: "1w", label: "1 Week" },
  { value: "2w", label: "2 Weeks" },
  { value: "3w", label: "3 Weeks" },
  { value: "1m", label: "1 Month" },
  { value: "custom", label: "Custom Duration" },
] as const;

export const CORRECT_OPTIONS = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
  { value: "option3", label: "Option 3" },
  { value: "option4", label: "Option 4" },
] as const;

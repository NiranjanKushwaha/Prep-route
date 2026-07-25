export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CREATE_TEST: "/tests/create",
  EDIT_TEST: (id: string) => `/tests/${id}/edit`,
  ADD_QUESTIONS: (id: string) => `/tests/${id}/questions`,
  PREVIEW_TEST: (id: string) => `/tests/${id}/preview`,
} as const;

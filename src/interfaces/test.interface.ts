export type TestStatus = "draft" | "live" | null;

export interface Test {
  id: string;
  name: string;
  type?: string;
  subject?: string | { id: string; name: string };
  subject_name?: string;
  topics?: string[] | { id: string; name: string }[];
  sub_topics?: string[];
  questions?: string[];
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  difficulty?: string;
  total_time?: number;
  total_marks?: number;
  total_questions?: number;
  status?: TestStatus | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CreateTestPayload {
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status?: string;
}

export interface UpdateTestPayload {
  name?: string;
  type?: string;
  subject?: string;
  topics?: string[];
  sub_topics?: string[];
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  difficulty?: string;
  total_time?: number;
  total_marks?: number;
  total_questions?: number;
  questions?: string[];
  status?: string | null;
  scheduled_date?: string | null;
  expiry_date?: string | null;
}

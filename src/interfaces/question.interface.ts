export interface Question {
  id?: string;
  type?: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string;
  explanation?: string;
  difficulty?: string;
  /** Required by POST /questions/bulk — use the subject name (GET /tests returns names). */
  subject?: string;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id?: string;
  [key: string]: unknown;
}

export interface BulkQuestionsPayload {
  questions: Question[];
}

import type { ApiResponse } from "./rest.service";
import { restService } from "./rest.service";
import type { Question } from "@/interfaces/question.interface";

export const questionService = {
  bulkCreate: (questions: Question[]) =>
    restService.post<ApiResponse<Question[]>>("/questions/bulk", { questions }),
  fetchBulk: (questionIds: string[]) =>
    restService.post<ApiResponse<Question[]>>("/questions/fetchBulk", {
      question_ids: questionIds,
    }),
};

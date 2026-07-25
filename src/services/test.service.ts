import type { ApiResponse } from "./rest.service";
import { restService } from "./rest.service";
import type { CreateTestPayload, Test, UpdateTestPayload } from "@/interfaces/test.interface";

export const testService = {
  list: () => restService.get<ApiResponse<Test[]>>("/tests"),
  getById: (id: string) => restService.get<ApiResponse<Test>>(`/tests/${id}`),
  create: (payload: CreateTestPayload) => restService.post<ApiResponse<Test>>("/tests", payload),
  update: (id: string, payload: UpdateTestPayload) =>
    restService.put<ApiResponse<Test>>(`/tests/${id}`, payload),
  publish: (id: string) => restService.put<ApiResponse<Test>>(`/tests/${id}`, { status: "live" }),
  remove: (id: string) => restService.delete<ApiResponse<null>>(`/tests/${id}`),
};

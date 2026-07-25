import type { ApiResponse } from "./rest.service";
import { restService } from "./rest.service";
import type { LoginPayload, LoginResponse } from "@/interfaces/auth.interface";

export const authService = {
  login: (payload: LoginPayload) =>
    restService.post<ApiResponse<LoginResponse>>("/auth/login", payload),
};

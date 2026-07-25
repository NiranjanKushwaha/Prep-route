export interface LoginPayload {
  userId: string;
  password: string;
}

export interface AuthUser {
  id?: string;
  userId?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

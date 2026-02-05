import { apiClient } from "./client";
import type {
  LoginCredentials,
  SignupData,
  AuthResponse,
} from "@/lib//types/auth";

/**
 * Authentication API endpoints
 */

export const authApi = {
  // Login with email/password
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthResponse>("/auth/login", {
      identifier: credentials.email,
      password: credentials.password,
    }),

  // Signup new user
  signup: (data: SignupData) =>
    apiClient.post<AuthResponse>("/auth/signup", data),

  // Logout user
  logout: () => apiClient.post<void>("/auth/logout"),

  // Get Current user
  getCurrentUser: () => apiClient.get<AuthResponse>("/auth/me"),

  // Refresh token
  refreshToken: () => apiClient.post<AuthResponse>("/auth/refresh"),
};

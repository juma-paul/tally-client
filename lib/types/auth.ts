export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: "user" | "admin";
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string
  agree: boolean
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}

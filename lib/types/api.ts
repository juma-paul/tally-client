// Generic Types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    page?: number;
    totalPages?: number;
    totalItems?: number;
  };
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

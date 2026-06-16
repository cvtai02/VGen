export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export function apiError(statusCode: number, error: string, message: string): ApiError {
  return { statusCode, error, message };
}

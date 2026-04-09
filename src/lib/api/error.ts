export type ApiErrorOptions = {
  code?: string;
  details?: unknown;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  headers?: Record<string, string>;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
    this.headers = options.headers;
  }
}


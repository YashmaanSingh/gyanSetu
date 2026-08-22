export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }

  static badRequest = (msg = "Bad request", code?: string, details?: unknown) =>
    new ApiError(400, msg, code, details);
  static unauthorized = (msg = "Unauthorized", code?: string) => new ApiError(401, msg, code);
  static forbidden = (msg = "Forbidden", code?: string) => new ApiError(403, msg, code);
  static notFound = (msg = "Not found", code?: string) => new ApiError(404, msg, code);
  static conflict = (msg = "Conflict", code?: string) => new ApiError(409, msg, code);
  static tooMany = (msg = "Too many requests", code?: string) => new ApiError(429, msg, code);
  static internal = (msg = "Internal server error", code?: string) => new ApiError(500, msg, code);
}

export const badRequest = (msg = "Bad request", code?: string, details?: unknown) =>
  new ApiError(400, msg, code, details);
export const unauthorized = (msg = "Unauthorized", code?: string) =>
  new ApiError(401, msg, code);
export const forbidden = (msg = "Forbidden", code?: string) =>
  new ApiError(403, msg, code);
export const notFound = (msg = "Not found", code?: string) =>
  new ApiError(404, msg, code);
export const conflict = (msg = "Conflict", code?: string) =>
  new ApiError(409, msg, code);
export const tooMany = (msg = "Too many requests", code?: string) =>
  new ApiError(429, msg, code);
export const internal = (msg = "Internal server error", code?: string) =>
  new ApiError(500, msg, code);

export function asyncHandler(
  fn: (req: any, res: any, next: any) => any
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

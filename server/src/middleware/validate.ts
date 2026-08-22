import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../utils/errors";

export function validate(
  schema: z.ZodTypeAny,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse((req as any)[source]);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path?.join(".") || "value";
      return next(
        ApiError.badRequest(issue ? `${where}: ${issue.message}` : "Invalid input")
      );
    }
    (req as any)[source] = parsed.data;
    next();
  };
}

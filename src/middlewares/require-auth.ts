import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/auth";
import { HttpError } from "../utils/http-error";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) throw new HttpError(401, "Missing authorization token");

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

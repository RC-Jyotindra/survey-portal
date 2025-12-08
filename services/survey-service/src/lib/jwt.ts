import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string; // userId
  tenant_id: string;
  products: Array<{ code: "SB" | "PM" | "PMM"; role: string }>;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

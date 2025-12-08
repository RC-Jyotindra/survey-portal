import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

type ProductClaim = { code: string; role: string };

export function signAuthToken(input: {
  userId: string;
  tenantId: string;
  products: ProductClaim[];
}) {
  const payload = {
    sub: input.userId,
    tenant_id: input.tenantId,
    products: input.products,
  };
  // @ts-ignore
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

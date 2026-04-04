import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'ogame2d-dev-secret-change-me';
const EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  username: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

import type { Role } from '@prisma/client';

import jwt from 'jsonwebtoken';

import config from '~/config/jwt';

const jwtSecret: string = config.secret;

if (jwtSecret === 'YOUR_SUPER_SECRET_KEY' && process.env.NODE_ENV === 'production') {
  throw Error('Error : Please set JWT_SECRET env you using YOUR_SUPER_SECRET_KEY in production');
}

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, jwtSecret, config.options);
};

export const verifyToken = (token: string): Pick<JwtPayload, 'userId' | 'role'> | null => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as { iat: number; exp: number } & JwtPayload;

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('JWT Verification Error:', error);

    return null;
  }
};

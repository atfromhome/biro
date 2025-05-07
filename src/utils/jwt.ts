import jwt from 'jsonwebtoken';

import config from '~/config/jwt';
import logger from '~/config/logger';

const jwtSecret: string = config.secret;

if (jwtSecret === 'YOUR_SUPER_SECRET_KEY' && process.env.NODE_ENV === 'production') {
  logger.fatal('FATAL ERROR: JWT_SECRET menggunakan nilai default di mode produksi. Harap ganti!');

  throw Error('Error : Please set JWT_SECRET env you using YOUR_SUPER_SECRET_KEY in production');
}

interface JwtPayload {
  email: string;
  name: string;
  userId: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, jwtSecret, config.options);
};

export const verifyToken = (token: string): null | Pick<JwtPayload, 'userId'> => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as { exp: number; iat: number } & JwtPayload;

    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(
        { jwtError: { message: error.message, name: error.name } },
        'JWT Verification Error',
      );
    } else {
      logger.error({ error }, 'Unexpected error during JWT verification');
    }

    return null;
  }
};

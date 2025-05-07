/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import type { NextFunction, Request, Response } from 'express';

import logger from '~/config/logger';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ApiError } from '~/errors/api.error';
import { verifyToken } from '~/utils/jwt';

export const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ path: req.path }, 'Authentication Error: No token provided or invalid format');

    return next(
      new ApiError(
        401,
        'Akses ditolak. Token tidak disediakan atau format salah.',
        ApiErrorCode.AUTH_NO_TOKEN,
      ),
    );
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    logger.warn({ path: req.path }, 'Authentication Error: Token string is empty after split');

    return next(
      new ApiError(401, 'Akses ditolak. Token tidak valid.', ApiErrorCode.AUTH_INVALID_TOKEN),
    );
  }

  const verifiedPayload = verifyToken(token);

  if (!verifiedPayload) {
    return next(
      new ApiError(401, 'Akses ditolak. Token tidak valid.', ApiErrorCode.AUTH_INVALID_TOKEN),
    );
  }

  req.user = verifiedPayload;

  logger.debug({ path: req.path, userId: req.user.userId }, 'User authenticated');

  return next();
};

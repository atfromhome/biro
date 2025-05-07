/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextFunction, Response, Request } from 'express';

import { ApiError } from '~/errors/api.error';
import logger from '~/config/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  const errorContext = {
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
    body: req.body,
    ip: req.ip,
  };

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(
        { context: errorContext, details: err.details, err },
        `ApiError (Server): ${err.message}`,
      );
    } else {
      logger.warn(
        { context: errorContext, details: err.details, err },
        `ApiError (Client): ${err.message}`,
      );
    }

    res.status(err.statusCode).json({
      error: {
        code: err.errorCode ?? 'UNSPECIFIED_ERROR',
        message: err.message,
        details: err.details,
      },
    });
  } else {
    logger.error({ context: errorContext, err }, `UNEXPECTED ERROR: ${err.message}`);

    res.status(500).json({
      error: {
        message: 'Terjadi kesalahan internal pada server.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
};

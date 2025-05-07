/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextFunction, Response, Request } from 'express';

import { ApiError } from '~/errors/api.error';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode ?? 'UNSPECIFIED_ERROR',
        message: err.message,
        details: err.details,
      },
    });
  } else {
    console.error('UNEXPECTED ERROR:', err);

    res.status(500).json({
      error: {
        message: 'Terjadi kesalahan internal pada server.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
};

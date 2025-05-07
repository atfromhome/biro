/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextFunction, Response, Request } from 'express';

import { type AnyZodObject } from 'zod';
import { ZodError } from 'zod';

import { formatZodError } from '~/utils/error-formatter';
import { ApiError } from '~/errors/api.error';

export const validateRequest =
  (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedSchema = await schema.safeParseAsync({
        params: req.params,
        query: req.query,
        body: req.body,
      });

      if (!parsedSchema.success) {
        const { primaryMessage, details } = formatZodError(parsedSchema.error);

        throw new ApiError(400, primaryMessage, 'VALIDATION_ERROR', details);
      }

      if (parsedSchema.data.body) {
        req.body = parsedSchema.data.body;
      }

      if (parsedSchema.data.query) {
        req.query = parsedSchema.data.query;
      }

      if (parsedSchema.data.params) {
        req.params = parsedSchema.data.params;
      }

      return next();
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }

      if (error instanceof ZodError) {
        const { primaryMessage, details } = formatZodError(error);

        return next(new ApiError(400, primaryMessage, 'VALIDATION_ERROR', details));
      }

      return next(
        new ApiError(500, 'Terjadi kesalahan validasi internal.', 'INTERNAL_SERVER_ERROR'),
      );
    }
  };

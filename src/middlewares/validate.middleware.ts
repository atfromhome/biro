/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextFunction, Request, Response } from 'express';

import { type AnyZodObject } from 'zod';
import { ZodError } from 'zod';

import { ApiErrorCode } from '~/constants/errorCodes';
import { ApiError } from '~/errors/api.error';
import { formatZodError } from '~/utils/error-formatter';

export const validateRequest =
  (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedSchema = await schema.safeParseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!parsedSchema.success) {
        const { details, primaryMessage } = formatZodError(parsedSchema.error);

        throw new ApiError(400, primaryMessage, ApiErrorCode.VALIDATION_ERROR, details);
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
        const { details, primaryMessage } = formatZodError(error);

        return next(new ApiError(400, primaryMessage, ApiErrorCode.VALIDATION_ERROR, details));
      }

      return next(
        new ApiError(
          500,
          'Terjadi kesalahan validasi internal.',
          ApiErrorCode.INTERNAL_SERVER_ERROR,
        ),
      );
    }
  };

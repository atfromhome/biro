import type { NextFunction, Response, Request } from 'express';

import type { RegisterCustomerInput } from '~/dtos/auth.dto';

import * as authAction from '~/actions/auth.action';
import { ActionError } from '~/errors/action.error';
import { ApiError } from '~/errors/api.error';

export const registerCustomerHandler = async (
  req: Request<object, object, RegisterCustomerInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authAction.registerCustomerAction(req.body);

    res.status(201).json({ result });
  } catch (error) {
    if (error instanceof ActionError) {
      next(
        new ApiError(409, error.message, 'AUTH_EMAIL_EXISTS', [
          { message: error.message, field: 'body.email' },
        ]),
      );
    } else {
      next(error);
    }
  }
};

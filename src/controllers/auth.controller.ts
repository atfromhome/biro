import type { NextFunction, Request, Response } from 'express';

import type { LoginInput, RegisterInput } from '~/dtos/auth.dto';

import * as authAction from '~/actions/auth.action';
import { ActionError } from '~/errors/action.error';
import { ApiError } from '~/errors/api.error';

export const registerCustomerHandler = async (
  req: Request<object, object, RegisterInput>,
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
          { field: 'body.email', message: error.message },
        ]),
      );
    } else {
      next(error);
    }
  }
};

export const loginUserHandler = async (
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authAction.loginUserAction(req.body);

    res.status(200).json({
      data: result,
      message: 'Login berhasil',
    });
  } catch (error) {
    if (error instanceof ActionError) {
      next(new ApiError(401, error.message, 'AUTH_INVALID_CREDENTIALS'));
    } else {
      next(error);
    }
  }
};

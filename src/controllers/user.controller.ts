import type { NextFunction, Request, Response } from 'express';

import * as userAction from '~/actions/user.action';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';
import { ApiError } from '~/errors/api.error';

export const getUserProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      next(new ApiError(401, 'Tidak terautentikasi.', ApiErrorCode.AUTH_NOT_AUTHENTICATED));

      return;
    }

    const userId = req.user.userId;
    const userProfile = await userAction.getUserProfileById(userId);

    res.status(200).json({ ...userProfile });
  } catch (error) {
    if (error instanceof ActionError) {
      const statusCode = error.errorCode === ApiErrorCode.ACTION_USER_NOT_FOUND ? 404 : 400;

      next(new ApiError(statusCode, error.message, error.errorCode));
    } else {
      next(error);
    }
  }
};

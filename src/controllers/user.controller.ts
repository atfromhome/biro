import type { NextFunction, Request, Response } from 'express';

import type { GetTicketsQueryInput } from '~/dtos/ticket.dto';

import * as ticketAction from '~/actions/ticket.action';
import * as userAction from '~/actions/user.action';
import logger from '~/config/logger';
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

export const getMyTicketsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new ApiError(401, 'Tidak terautentikasi.', ApiErrorCode.AUTH_NOT_AUTHENTICATED);
    }
    const userId = req.user.userId;
    const queryParams: GetTicketsQueryInput = req.query as unknown as GetTicketsQueryInput;

    logger.info({ queryParams, userId }, 'User requesting their tickets');

    const paginatedTickets = await ticketAction.getMyCreatedTicketsAction(userId, queryParams);

    res.status(200).json({ ...paginatedTickets });
  } catch (error) {
    logger.warn(
      { err: error, userId: req.user?.userId },
      `Error fetching user tickets: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof ActionError) {
      next(new ApiError(500, error.message, ApiErrorCode.INTERNAL_SERVER_ERROR));
    } else {
      next(error);
    }
  }
};

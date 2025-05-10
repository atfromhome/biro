import type { NextFunction, Request, Response } from 'express';

import type { GetTicketCommentsParams, GetTicketCommentsQueryInput } from '~/dtos/comment.dto';

import * as commentAction from '~/actions/comment.action';
import logger from '~/config/logger';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';
import { ApiError } from '~/errors/api.error';

export const getTicketCommentsHandler = async (
  req: Request<GetTicketCommentsParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId, ticketId } = req.params;
  const actor = req.user;
  const queryParams = req.query as unknown as GetTicketCommentsQueryInput;

  if (!actor?.userId) {
    next(new ApiError(401, 'Tidak terautentikasi.', ApiErrorCode.AUTH_NOT_AUTHENTICATED));

    return;
  }

  logger.info(
    { actorId: actor.userId, queryParams, teamId, ticketId },
    'User requesting ticket comments',
  );

  try {
    const paginatedComments = await commentAction.getTicketCommentsAction(
      { id: actor.userId },
      teamId,
      ticketId,
      queryParams,
    );

    res.status(200).json({ ...paginatedComments });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, err: error, teamId, ticketId },
      `Error fetching ticket comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof ActionError) {
      if (ApiErrorCode.RESOURCE_FORBIDDEN === error.errorCode) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (ApiErrorCode.RESOURCE_NOT_FOUND === error.errorCode) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(500, error.message, ApiErrorCode.INTERNAL_SERVER_ERROR));
      }
    } else {
      next(error);
    }
  }
};

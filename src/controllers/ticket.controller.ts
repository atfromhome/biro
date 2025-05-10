import type { NextFunction, Request, Response } from 'express';

import type {
  CreateTicketInput,
  CreateTicketParams,
  GetTicketDetailParams,
  TicketActionParams,
  UpdateTicketCategoryInput,
  UpdateTicketCoreInput,
  UpdateTicketParams,
  UpdateTicketPriorityInput,
} from '~/dtos/ticket.dto';

import * as ticketAction from '~/actions/ticket.action';
import logger from '~/config/logger';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';
import { ApiError } from '~/errors/api.error';

export const createTicketHandler = async (
  req: Request<CreateTicketParams, unknown, CreateTicketInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId } = req.params;
  const actor = req.user;

  if (!actor?.userId) {
    next(
      new ApiError(
        401,
        'Tidak terautentikasi untuk aksi ini.',
        ApiErrorCode.AUTH_NOT_AUTHENTICATED,
      ),
    );

    return;
  }

  logger.info({ actorId: actor.userId, teamId }, 'Attempting to create ticket');

  try {
    const ticketInput = req.body;
    const newTicket = await ticketAction.createTicketAction(
      { id: actor.userId },
      teamId,
      ticketInput,
    );

    res.status(201).json({ ...newTicket });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, err: error, teamId },
      `Error during ticket creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    if (error instanceof ActionError) {
      if (error.errorCode === ApiErrorCode.RESOURCE_FORBIDDEN) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (
        error.errorCode === ApiErrorCode.ACTION_USER_NOT_FOUND ||
        error.errorCode === ApiErrorCode.RESOURCE_NOT_FOUND
      ) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(400, error.message, ApiErrorCode.VALIDATION_ERROR));
      }
    } else {
      next(error);
    }
  }
};

export const updateTicketCoreInfoHandler = async (
  req: Request<UpdateTicketParams, unknown, UpdateTicketCoreInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId, ticketId } = req.params;
  const actor = req.user;

  if (!actor?.userId) {
    next(
      new ApiError(
        401,
        'Tidak terautentikasi untuk aksi ini.',
        ApiErrorCode.AUTH_NOT_AUTHENTICATED,
      ),
    );

    return;
  }

  logger.info(
    { actorId: actor.userId, body: req.body, teamId, ticketId },
    'Attempting to update ticket core info',
  );

  try {
    const updateData = req.body;

    const updatedTicket = await ticketAction.updateTicketCoreInfoAction(
      { id: actor.userId },
      teamId,
      ticketId,
      updateData,
    );

    res.status(200).json({ ...updatedTicket });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, err: error, teamId, ticketId },
      `Error during ticket core info update: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof ActionError) {
      if (ApiErrorCode.RESOURCE_FORBIDDEN === error.errorCode) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (ApiErrorCode.RESOURCE_NOT_FOUND === error.errorCode) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(400, error.message, ApiErrorCode.VALIDATION_ERROR));
      }
    } else {
      next(error);
    }
  }
};

export const getTicketDetailHandler = async (
  req: Request<GetTicketDetailParams, unknown, unknown>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId, ticketId } = req.params;
  const actor = req.user;

  if (!actor?.userId) {
    next(
      new ApiError(
        401,
        'Tidak terautentikasi untuk aksi ini.',
        ApiErrorCode.AUTH_NOT_AUTHENTICATED,
      ),
    );

    return;
  }

  logger.info({ actorId: actor.userId, teamId, ticketId }, 'Attempting to get ticket detail');

  try {
    const ticketDetail = await ticketAction.getTicketDetailAction(
      { id: actor.userId },
      teamId,
      ticketId,
    );

    res.status(200).json({ ...ticketDetail });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, err: error, teamId, ticketId },
      `Error getting ticket detail: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof ActionError) {
      if (error.errorCode === ApiErrorCode.RESOURCE_FORBIDDEN) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (error.errorCode === ApiErrorCode.RESOURCE_NOT_FOUND) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(500, error.message, ApiErrorCode.INTERNAL_SERVER_ERROR));
      }
    } else {
      next(error);
    }
  }
};

export const updateTicketPriorityHandler = async (
  req: Request<TicketActionParams, unknown, UpdateTicketPriorityInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId, ticketId } = req.params;
  const actor = req.user;
  const { priority: newPriority } = req.body;

  if (!actor?.userId) {
    next(
      new ApiError(
        401,
        'Tidak terautentikasi untuk aksi ini.',
        ApiErrorCode.AUTH_NOT_AUTHENTICATED,
      ),
    );

    return;
  }

  logger.info(
    { actorId: actor.userId, newPriority, teamId, ticketId },
    'Attempting to update ticket priority',
  );

  try {
    const updatedTicket = await ticketAction.updateTicketPriorityAction(
      { id: actor.userId },
      teamId,
      ticketId,
      newPriority,
    );

    res.status(200).json({ ...updatedTicket });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, err: error, newPriority, teamId, ticketId },
      `Error during ticket priority update: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    if (error instanceof ActionError) {
      if (ApiErrorCode.RESOURCE_FORBIDDEN === error.errorCode) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (ApiErrorCode.RESOURCE_NOT_FOUND === error.errorCode) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(400, error.message, ApiErrorCode.VALIDATION_ERROR));
      }
    } else {
      next(error);
    }
  }
};

export const updateTicketCategoryHandler = async (
  req: Request<TicketActionParams, unknown, UpdateTicketCategoryInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { teamId, ticketId } = req.params;
  const actor = req.user;
  const { categoryId } = req.body;

  if (!actor?.userId) {
    next(
      new ApiError(
        401,
        'Tidak terautentikasi untuk aksi ini.',
        ApiErrorCode.AUTH_NOT_AUTHENTICATED,
      ),
    );

    return;
  }

  logger.info(
    { actorId: actor.userId, categoryId, teamId, ticketId },
    'Attempting to update ticket category',
  );

  try {
    const updatedTicket = await ticketAction.updateTicketCategoryAction(
      { id: actor.userId },
      teamId,
      ticketId,
      categoryId,
    );

    res.status(200).json({ ...updatedTicket });
  } catch (error) {
    logger.warn(
      { actorId: actor.userId, categoryId, err: error, teamId, ticketId },
      `Error during ticket category update: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof ActionError) {
      if (ApiErrorCode.RESOURCE_FORBIDDEN === error.errorCode) {
        next(new ApiError(403, error.message, ApiErrorCode.RESOURCE_FORBIDDEN));
      } else if (ApiErrorCode.RESOURCE_NOT_FOUND === error.errorCode) {
        next(new ApiError(404, error.message, ApiErrorCode.RESOURCE_NOT_FOUND));
      } else {
        next(new ApiError(400, error.message, ApiErrorCode.VALIDATION_ERROR));
      }
    } else {
      next(error);
    }
  }
};

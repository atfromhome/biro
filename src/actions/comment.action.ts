import { Prisma, Role as PrismaRole, Role } from '@prisma/client';

import type {
  CommentListItemOutput,
  GetTicketCommentsQueryInput,
  PaginatedCommentsResponse,
} from '~/dtos/comment.dto';

import { prisma } from '~/config/database';
import logger from '~/config/logger';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';

interface Actor {
  id: string;
}

export const getTicketCommentsAction = async (
  actor: Actor,
  teamId: string,
  ticketId: string,
  query: GetTicketCommentsQueryInput,
): Promise<PaginatedCommentsResponse> => {
  const { limit = 10, page = 1, sortBy = 'created_at', sortOrder = 'asc' } = query;

  const skip = (page - 1) * limit;

  logger.debug({ actorId: actor.id, query, teamId, ticketId }, 'Fetching ticket comments');

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId, teamId: teamId },
  });

  if (!ticket) {
    logger.warn(
      { actorId: actor.id, teamId, ticketId },
      `Tiket dengan ID '${ticketId}' tidak ditemukan di tim ini.`,
    );

    throw new ActionError(
      `Tiket dengan ID '${ticketId}' tidak ditemukan di tim ini.`,
      ApiErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  const actorMembership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { teamId: ticket.teamId, userId: actor.id } },
  });

  let canViewComments = false;
  const allowedRolesSet = new Set<Role>([PrismaRole.ADMIN, PrismaRole.AGENT, PrismaRole.OWNER]);

  if (ticket.creatorId === actor.id) {
    canViewComments = true;
  } else if (actorMembership && allowedRolesSet.has(actorMembership.role)) {
    canViewComments = true;
  }

  if (!canViewComments) {
    logger.warn(
      { actorId: actor.id, teamId: ticket.teamId, ticketId },
      'Actor not authorized to view comments for this ticket.',
    );
    throw new ActionError('Anda tidak memiliki izin untuk melihat komentar tiket ini.');
  }

  const whereConditions: Prisma.CommentWhereInput = {
    ticketId: ticketId,
    ...((!actorMembership || actorMembership.role === PrismaRole.CUSTOMER) && {
      is_internal_note: false,
    }),
  };

  const orderByOptions: Prisma.CommentOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  try {
    const [comments, totalComments] = await prisma.$transaction([
      prisma.comment.findMany({
        orderBy: orderByOptions,
        select: {
          author: {
            select: { email: true, id: true, name: true },
          },
          content: true,
          createdAt: true,
          id: true,
          isInternalNote: true,
          updatedAt: true,
        },
        skip: skip,
        take: limit,
        where: whereConditions,
      }),
      prisma.comment.count({ where: whereConditions }),
    ]);

    const totalPages = Math.ceil(totalComments / limit);

    const formattedComments: CommentListItemOutput[] = comments.map((comment) => ({
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt,
      id: comment.id,
      isInternalNote: comment.isInternalNote,
      updatedAt: comment.updatedAt,
    }));

    return {
      currentPage: page,
      data: formattedComments,
      limit,
      totalComments,
      totalPages,
    };
  } catch (error) {
    logger.error(
      { actorId: actor.id, err: error, query, ticketId },
      'Error fetching ticket comments',
    );
    throw new ActionError('Gagal mengambil daftar komentar tiket.');
  }
};

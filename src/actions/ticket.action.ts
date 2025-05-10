import { Prisma, Role, type Ticket, TicketPriority, TicketStatus, type User } from '@prisma/client';

import type {
  CreateTicketInput,
  GetTicketsQueryInput,
  PaginatedTicketsResponse,
  TicketDetailOutput,
  TicketListItemOutput,
  UpdateTicketCoreInput,
} from '~/dtos/ticket.dto';

import { prisma } from '~/config/database';
import logger from '~/config/logger';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';

interface Actor {
  id: string;
}

async function ensureTeamMembership(userId: string, teamId: string): Promise<void> {
  try {
    await prisma.userTeam.upsert({
      create: { joinedAt: Math.floor(Date.now() / 1000), role: Role.CUSTOMER, teamId, userId },
      update: {},
      where: { userId_teamId: { teamId, userId } },
    });
  } catch (error) {
    logger.error({ err: error, teamId, userId }, 'Error ensuring team membership');

    throw new ActionError('Gagal memproses keanggotaan tim untuk pembuat tiket');
  }
}

export const createTicketAction = async (
  actor: Actor,
  teamId: string,
  input: CreateTicketInput,
): Promise<Partial<Ticket>> => {
  const { categoryId, customerEmail, description, priority, subject } = input;

  let creator: User;

  if (customerEmail) {
    logger.info(`Actor [${actor.id}] creating ticket for customer [${customerEmail}]`);

    const actorMembership = await prisma.userTeam.findUnique({
      select: { role: true },
      where: { userId_teamId: { teamId, userId: actor.id } },
    });

    const allowedRolesSet = new Set<Role>([Role.ADMIN, Role.AGENT, Role.OWNER]);

    if (!actorMembership || !allowedRolesSet.has(actorMembership.role)) {
      logger.warn(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Authorization failed: Actor [${actor.id}] role [${actorMembership?.role}] is not allowed to create tickets for others in team [${teamId}]`,
      );
      throw new ActionError(
        `Anda tidak memiliki izin untuk membuat tiket atas nama pengguna lain di tim ini.`,
        ApiErrorCode.RESOURCE_FORBIDDEN,
      );
    }

    const customerUser = await prisma.user.findUnique({
      where: { email: customerEmail },
    });

    if (!customerUser) {
      logger.warn(
        `Customer with email [${customerEmail}] not found when creating ticket in team [${teamId}] by actor [${actor.id}]`,
      );
      throw new ActionError(
        `Customer dengan email '${customerEmail}' tidak ditemukan. Mohon daftarkan customer terlebih dahulu atau periksa kembali email.`,
        ApiErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    creator = customerUser;
    logger.debug(
      `Creator identified as existing customer [${creator.id}] via email [${customerEmail}]`,
    );
  } else {
    logger.info(`Actor [${actor.id}] creating ticket for self in team [${teamId}]`);

    const actorUser = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!actorUser) {
      logger.error(`Actor user data not found for ID [${actor.id}] during self-ticket creation.`);
      throw new ActionError(
        'Data pengguna pembuat aksi tidak ditemukan.',
        ApiErrorCode.ACTION_USER_NOT_FOUND,
      );
    }
    creator = actorUser;
    logger.debug(`Creator identified as self (actor) [${creator.id}]`);
  }

  await ensureTeamMembership(creator.id, teamId);

  try {
    const newTicket = await prisma.ticket.create({
      data: {
        createdAt: Math.floor(Date.now() / 1000),
        creator: { connect: { id: creator.id } },
        description,
        // Temporery number untuk memperbaiki error type
        // Akan di ganti otomatis saat insert oleh trigger
        number: 'TEMP-' + Date.now().toString(),
        priority: priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        subject,
        team: { connect: { id: teamId } },
        updatedAt: Math.floor(Date.now() / 1000),
        ...(categoryId && { category: { connect: { id: categoryId } } }),
      },
      select: {
        createdAt: true,
        description: true,
        id: true,
        number: true,
        priority: true,
        status: true,
        subject: true,
        updatedAt: true,
      },
    });
    logger.info(
      `Ticket [${newTicket.number}] created successfully in team [${teamId}] by actor [${actor.id}] for creator [${creator.id}]`,
    );

    return newTicket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { actorId: actor.id, creatorId: creator.id, err: error, teamId },
      'Error creating ticket in database',
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (error.code === 'P2003' && error.meta?.field_name?.includes('team_id')) {
      throw new ActionError(`Tim dengan ID '${teamId}' tidak ditemukan.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (error.code === 'P2003' && error.meta?.field_name?.includes('category_id')) {
      throw new ActionError(`Kategori dengan ID yang diberikan tidak ditemukan.`);
    }

    throw new ActionError('Gagal menyimpan tiket ke database.');
  }
};

export const getMyCreatedTicketsAction = async (
  userId: string,
  query: GetTicketsQueryInput,
): Promise<PaginatedTicketsResponse> => {
  const {
    limit = 15,
    page = 1,
    priority,
    q,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    teamId,
  } = query;

  const skip = (page - 1) * limit;

  const whereConditions: Prisma.TicketWhereInput = {
    creatorId: userId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(q && {
      OR: [
        {
          subject: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ],
    }),
    ...(teamId && { teamId }),
  };

  const orderByOptions: Prisma.TicketOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  logger.debug(
    { limit, orderByOptions, query, skip, userId, whereConditions },
    "Fetching user's created tickets",
  );

  try {
    const [tickets, totalTickets] = await prisma.$transaction([
      prisma.ticket.findMany({
        orderBy: orderByOptions,
        select: {
          category: { select: { id: true, name: true } },
          createdAt: true,
          id: true,
          number: true,
          priority: true,
          status: true,
          subject: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              ticketPrefixNumber: true,
            },
          },
          ticketLabels: { include: { label: true } },
          updatedAt: true,
        },
        skip: skip,
        take: limit,
        where: whereConditions,
      }),
      prisma.ticket.count({ where: whereConditions }),
    ]);

    const totalPages = Math.ceil(totalTickets / limit);

    const formattedTickets: TicketListItemOutput[] = tickets.map((ticket) => ({
      category: ticket.category,
      createdAt: ticket.createdAt,
      id: ticket.id,
      labels: ticket.ticketLabels.map((tl) => tl.label),
      number: ticket.number,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      team: ticket.team,
      updatedAt: ticket.updatedAt,
    }));

    return {
      currentPage: page,
      data: formattedTickets,
      limit,
      totalPages,
      totalTickets,
    };
  } catch (error) {
    logger.error({ err: error, query, userId }, "Error fetching user's created tickets");

    throw new ActionError('Gagal mengambil daftar tiket Anda.');
  }
};

type UpdatedTicketOutput = Partial<Ticket>;

export const updateTicketCoreInfoAction = async (
  actor: Actor,
  teamId: string,
  ticketId: string,
  input: UpdateTicketCoreInput,
): Promise<UpdatedTicketOutput> => {
  const { description, subject } = input;

  logger.debug(
    { actorId: actor.id, input, teamId, ticketId },
    'Attempting to update ticket core info',
  );

  const ticketToUpdate = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticketToUpdate) {
    logger.warn(
      { actorId: actor.id, ticketId },
      `Ticket update attempt: Ticket [${ticketId}] not found.`,
    );

    throw new ActionError(
      `Tiket dengan ID '${ticketId}' tidak ditemukan.`,
      ApiErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  if (ticketToUpdate.teamId !== teamId) {
    logger.warn(
      { actorId: actor.id, actualTeamId: ticketToUpdate.teamId, requestedTeamId: teamId, ticketId },
      `Ticket update attempt: Ticket [${ticketId}] does not belong to team [${teamId}].`,
    );
    throw new ActionError(
      `Akses ditolak. Tiket ini bukan bagian dari tim yang Anda akses.`,
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  if (
    ticketToUpdate.status === TicketStatus.CLOSED ||
    ticketToUpdate.status === TicketStatus.LOCKED
  ) {
    logger.warn(
      { actorId: actor.id, status: ticketToUpdate.status, ticketId },
      `Ticket update attempt DENIED: Ticket is [${ticketToUpdate.status}].`,
    );
    throw new ActionError(
      `Tiket yang sudah '${ticketToUpdate.status}' tidak dapat diubah lagi detailnya.`,
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  const actorMembership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { teamId: ticketToUpdate.teamId, userId: actor.id } },
  });

  let canUpdate = false;
  const allowedRolesSet = new Set<Role>([Role.ADMIN, Role.AGENT, Role.OWNER]);

  if (actorMembership && allowedRolesSet.has(actorMembership.role)) {
    canUpdate = true;

    logger.info(
      `Actor [${actor.id}] with role [${actorMembership.role}] is authorized to update ticket [${ticketId}]`,
    );
  } else if (ticketToUpdate.creatorId === actor.id) {
    if (ticketToUpdate.status === TicketStatus.OPEN) {
      canUpdate = true;
      logger.info(
        `Actor (creator) [${actor.id}] is authorized to update ticket [${ticketId}] (status: OPEN)`,
      );
    } else {
      logger.warn(
        `Actor (creator) [${actor.id}] DENIED update for ticket [${ticketId}]. Status is [${ticketToUpdate.status}], not OPEN.`,
      );
    }
  } else {
    logger.warn(
      {
        actorId: actor.id,
        actorRoleInTeam: actorMembership?.role ?? 'Not a member',
        creatorId: ticketToUpdate.creatorId,
        ticketId,
        ticketStatus: ticketToUpdate.status,
      },
      `Actor is not the creator and not a privileged member for ticket update. DENIED.`,
    );
  }

  if (!canUpdate) {
    throw new ActionError(
      'Anda tidak memiliki izin untuk memperbarui detail tiket ini atau tiket tidak dalam status yang memungkinkan pembaruan oleh Anda.',
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  const dataToUpdate: { description?: string; subject?: string; updatedAt?: number } = {};
  let hasChanges = false;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (subject !== undefined && subject !== null && subject !== ticketToUpdate.subject) {
    dataToUpdate.subject = subject;
    dataToUpdate.updatedAt = Math.floor(Date.now() / 1000);
    hasChanges = true;
  }

  if (
    description !== undefined &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    description !== null &&
    description !== ticketToUpdate.description
  ) {
    dataToUpdate.description = description;
    dataToUpdate.updatedAt = Math.floor(Date.now() / 1000);
    hasChanges = true;
  }

  if (!hasChanges) {
    logger.info(
      { actorId: actor.id, ticketId },
      'Ticket update attempt: No actual changes provided for subject or description. Returning current ticket data.',
    );

    return {
      createdAt: ticketToUpdate.createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      description: ticketToUpdate.description ?? '',
      id: ticketToUpdate.id,
      number: ticketToUpdate.number,
      priority: ticketToUpdate.priority,
      status: ticketToUpdate.status,
      subject: ticketToUpdate.subject,
      updatedAt: ticketToUpdate.updatedAt,
    };
  }

  try {
    const updatedTicket = await prisma.ticket.update({
      data: dataToUpdate,
      select: {
        createdAt: true,
        description: true,
        id: true,
        number: true,
        priority: true,
        status: true,
        subject: true,
        updatedAt: true,
      },
      where: { id: ticketId },
    });

    logger.info(`Ticket [${ticketId}] core info updated successfully by actor [${actor.id}]`);
    return updatedTicket;
  } catch (error) {
    logger.error(
      { actorId: actor.id, dataToUpdate, err: error, ticketId },
      'Error updating ticket core info in database',
    );
    throw new ActionError('Gagal memperbarui tiket di database.');
  }
};

export const getTicketDetailAction = async (
  actor: Actor,
  teamId: string,
  ticketId: string,
): Promise<TicketDetailOutput> => {
  logger.debug({ actorId: actor.id, teamId, ticketId }, 'Attempting to fetch ticket detail');

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await prisma.ticket.findUnique({
      include: {
        assignedAgent: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
        ticketLabels: {
          select: {
            label: {
              select: { color: true, id: true, name: true },
            },
          },
        },
      },
      where: {
        id: ticketId,
        teamId: teamId,
      },
    });

    if (!ticket) {
      return null;
    }

    const commentCount = await tx.comment.count({
      where: { ticketId: ticketId },
    });

    return { commentCount, ticket };
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!result || !result.ticket) {
    logger.warn(
      { actorId: actor.id, teamId, ticketId },
      `Ticket detail fetch attempt: Ticket [${ticketId}] not found in team [${teamId}].`,
    );
    throw new ActionError(
      `Tiket dengan ID '${ticketId}' tidak ditemukan di tim ini.`,
      ApiErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  const { commentCount, ticket } = result;

  const actorMembership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { teamId: ticket.teamId, userId: actor.id } },
  });

  let canView = false;
  const allowedRolesSet = new Set<Role>([Role.ADMIN, Role.AGENT, Role.OWNER]);

  if (ticket.creatorId === actor.id) {
    canView = true;
    logger.info(`Actor (creator) [${actor.id}] is authorized to view ticket [${ticketId}]`);
  } else if (actorMembership && allowedRolesSet.has(actorMembership.role)) {
    canView = true;

    logger.info(
      `Actor [${actor.id}] with role [${actorMembership.role}] in team [${ticket.teamId}] is authorized to view ticket [${ticketId}]`,
    );
  } else {
    logger.warn(
      {
        actorId: actor.id,
        actorRoleInTeam: actorMembership?.role ?? 'Not a member or not relevant role',
        creatorId: ticket.creatorId,
        ticketId,
      },
      `Actor authorization DENIED for viewing ticket [${ticketId}].`,
    );
  }

  if (!canView) {
    throw new ActionError(
      'Anda tidak memiliki izin untuk melihat detail tiket ini.',
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  const formattedTicket: TicketDetailOutput = {
    assignedAgent: ticket.assignedAgent
      ? {
          id: ticket.assignedAgent.id,
          name: ticket.assignedAgent.name,
        }
      : null,
    category: ticket.category
      ? {
          id: ticket.category.id,
          name: ticket.category.name,
        }
      : null,
    closedAt: ticket.closedAt,
    commentCount: commentCount,
    createdAt: ticket.createdAt,
    creator: ticket.creator,
    description: ticket.description,
    id: ticket.id,
    labels: ticket.ticketLabels.map((tl) => tl.label),
    number: ticket.number,
    priority: ticket.priority,
    resolvedAt: ticket.resolvedAt,
    status: ticket.status,
    subject: ticket.subject,
    team: {
      id: ticket.team.id,
      name: ticket.team.name,
      slug: ticket.team.slug,
    },
    updatedAt: ticket.updatedAt,
  };

  return formattedTicket;
};

type UpdatedTicketPriorityOutput = Partial<Ticket>;

export const updateTicketPriorityAction = async (
  actor: Actor,
  teamId: string,
  ticketId: string,
  newPriority: TicketPriority,
): Promise<UpdatedTicketPriorityOutput> => {
  logger.debug(
    { actorId: actor.id, newPriority, teamId, ticketId },
    'Attempting to update ticket priority',
  );

  const ticketToUpdate = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticketToUpdate) {
    logger.warn(
      { actorId: actor.id, ticketId },
      `Update priority: Ticket [${ticketId}] not found.`,
    );
    throw new ActionError(`Tiket dengan ID '${ticketId}' tidak ditemukan.`);
  }
  if (ticketToUpdate.teamId !== teamId) {
    logger.warn(
      {
        actorId: actor.id,
        actualTeamId: ticketToUpdate.teamId,
        requestedTeamId: teamId,
        ticketId,
      },
      `Update priority: Ticket [${ticketId}] does not belong to team [${teamId}].`,
    );
    throw new ActionError(
      `Akses ditolak. Tiket ini bukan bagian dari tim yang Anda akses.`,
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  if (
    ticketToUpdate.status === TicketStatus.CLOSED ||
    ticketToUpdate.status === TicketStatus.LOCKED
  ) {
    logger.warn(
      { actorId: actor.id, status: ticketToUpdate.status, ticketId },
      `Update priority DENIED: Ticket is [${ticketToUpdate.status}].`,
    );
    throw new ActionError(
      `Tiket yang sudah '${ticketToUpdate.status}' tidak dapat diubah prioritasnya.`,
    );
  }

  const actorMembership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { teamId: ticketToUpdate.teamId, userId: actor.id } },
  });

  let canUpdate = false;
  const allowedRolesSet = new Set<Role>([Role.ADMIN, Role.AGENT, Role.OWNER]);

  if (actorMembership && allowedRolesSet.has(actorMembership.role)) {
    canUpdate = true;
  } else if (ticketToUpdate.creatorId === actor.id && ticketToUpdate.status === TicketStatus.OPEN) {
    canUpdate = true;
  } else {
    logger.warn(
      {
        actorId: actor.id,
        actorRoleInTeam: actorMembership?.role ?? 'Not a member',
        creatorId: ticketToUpdate.creatorId,
        ticketId,
        ticketStatus: ticketToUpdate.status,
      },
      `Actor authorization DENIED for ticket priority update.`,
    );
  }

  if (!canUpdate) {
    throw new ActionError(
      'Anda tidak memiliki izin untuk memperbarui prioritas tiket ini atau tiket tidak dalam status yang memungkinkan pembaruan oleh Anda.',
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  if (ticketToUpdate.priority === newPriority) {
    logger.info(
      { actorId: actor.id, newPriority, ticketId },
      'Ticket priority update attempt: New priority is the same as the current one. No update performed.',
    );

    return {
      id: ticketToUpdate.id,
      number: ticketToUpdate.number,
      priority: ticketToUpdate.priority,
      updatedAt: ticketToUpdate.updatedAt,
    };
  }

  const dataToUpdate: Prisma.TicketUpdateInput = {
    priority: newPriority,
    updatedAt: Math.floor(Date.now() / 1000),
  };

  try {
    const updatedTicket = await prisma.ticket.update({
      data: dataToUpdate,
      select: {
        id: true,
        number: true,
        priority: true,
        updatedAt: true,
      },
      where: { id: ticketId },
    });

    logger.info(`Ticket [${ticketId}] priority updated to [${newPriority}] by actor [${actor.id}]`);

    return updatedTicket;
  } catch (error) {
    logger.error(
      { actorId: actor.id, err: error, newPriority, ticketId },
      'Error updating ticket priority in database',
    );
    throw new ActionError('Gagal memperbarui prioritas tiket di database.');
  }
};

type UpdatedTicketCategoryOutput = Partial<Ticket>;

export const updateTicketCategoryAction = async (
  actor: Actor,
  teamId: string,
  ticketId: string,
  categoryId: null | string,
): Promise<UpdatedTicketCategoryOutput> => {
  logger.debug(
    { actorId: actor.id, categoryId, teamId, ticketId },
    'Attempting to update ticket category',
  );

  const ticketToUpdate = await prisma.ticket.findUnique({
    include: { category: { select: { id: true, name: true } } },
    where: { id: ticketId },
  });

  if (!ticketToUpdate) {
    logger.warn(
      { actorId: actor.id, ticketId },
      `Update category: Ticket [${ticketId}] not found.`,
    );
    throw new ActionError(
      `Tiket dengan ID '${ticketId}' tidak ditemukan.`,
      ApiErrorCode.RESOURCE_NOT_FOUND,
    );
  }
  if (ticketToUpdate.teamId !== teamId) {
    logger.warn(
      {
        actorId: actor.id,
        actualTeamId: ticketToUpdate.teamId,
        requestedTeamId: teamId,
        ticketId,
      },
      `Update category: Ticket [${ticketId}] does not belong to team [${teamId}].`,
    );
    throw new ActionError(
      `Akses ditolak. Tiket ini bukan bagian dari tim yang Anda akses.`,
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  if (
    ticketToUpdate.status === TicketStatus.CLOSED ||
    ticketToUpdate.status === TicketStatus.LOCKED
  ) {
    logger.warn(
      { actorId: actor.id, status: ticketToUpdate.status, ticketId },
      `Update category DENIED: Ticket is [${ticketToUpdate.status}].`,
    );
    throw new ActionError(
      `Tiket yang sudah '${ticketToUpdate.status}' tidak dapat diubah kategorinya.`,
      ApiErrorCode.RESOURCE_FORBIDDEN,
    );
  }

  const actorMembership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { teamId: ticketToUpdate.teamId, userId: actor.id } },
  });

  let canUpdate = false;
  const allowedRolesSet = new Set<Role>([Role.ADMIN, Role.AGENT, Role.OWNER]);

  if (actorMembership && allowedRolesSet.has(actorMembership.role)) {
    canUpdate = true;
  } else if (ticketToUpdate.creatorId === actor.id && ticketToUpdate.status === TicketStatus.OPEN) {
    canUpdate = true;
  } else {
    logger.warn(
      {
        actorId: actor.id,
        actorRoleInTeam: actorMembership?.role ?? 'Not a member',
        creatorId: ticketToUpdate.creatorId,
        ticketId,
        ticketStatus: ticketToUpdate.status,
      },
      `Actor authorization DENIED for ticket category update.`,
    );
  }

  if (!canUpdate) {
    throw new ActionError(
      'Anda tidak memiliki izin untuk memperbarui kategori tiket ini atau tiket tidak dalam status yang memungkinkan pembaruan oleh Anda.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (categoryId !== undefined && categoryId !== null) {
    const categoryExists = await prisma.category.findUnique({
      where: {
        id: categoryId,
        teamId: teamId,
      },
    });

    if (!categoryExists) {
      logger.warn(
        { actorId: actor.id, categoryId, teamId, ticketId },
        `Category [${categoryId}] not found in team [${teamId}] during ticket category update.`,
      );

      throw new ActionError(
        `Kategori dengan ID '${categoryId}' tidak valid atau bukan milik tim ini.`,
        ApiErrorCode.VALIDATION_ERROR,
      );
    }
  }

  if (ticketToUpdate.categoryId === categoryId) {
    logger.info(
      { actorId: actor.id, categoryId, ticketId },
      'Ticket category update attempt: New categoryId is the same as the current one. No update performed.',
    );
    return {
      categoryId: ticketToUpdate.categoryId,
      id: ticketToUpdate.id,
      number: ticketToUpdate.number,
      updatedAt: ticketToUpdate.updatedAt,
    };
  }

  const dataToUpdate: Prisma.TicketUpdateInput = {};
  if (categoryId === null) {
    dataToUpdate.category = { disconnect: true };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (categoryId !== undefined) {
    dataToUpdate.category = { connect: { id: categoryId } };
    dataToUpdate.updatedAt = Math.floor(Date.now() / 1000);
  }

  try {
    const updatedTicket = await prisma.ticket.update({
      data: dataToUpdate,
      select: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        categoryId: true,
        id: true,
        number: true,
        updatedAt: true,
      },
      where: { id: ticketId },
    });

    logger.info(
      `Ticket [${ticketId}] category updated to [${categoryId ?? 'NULL'}] by actor [${actor.id}]`,
    );

    return updatedTicket;
  } catch (error) {
    logger.error(
      { actorId: actor.id, categoryId, err: error, ticketId },
      'Error updating ticket category in database',
    );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new ActionError(
          `Gagal memperbarui kategori tiket: Kategori dengan ID '${categoryId ?? 'NULL'}' tidak ditemukan.`,
          ApiErrorCode.VALIDATION_ERROR,
        );
      }
    }

    throw new ActionError('Gagal memperbarui kategori tiket di database.');
  }
};

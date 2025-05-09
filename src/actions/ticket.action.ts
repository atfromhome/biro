import { Role, type Ticket, TicketPriority, TicketStatus, type User } from '@prisma/client';

import type { CreateTicketInput } from '~/dtos/ticket.dto';

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

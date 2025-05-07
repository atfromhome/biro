import type { Role as PrismaRole, User } from '@prisma/client';

import { prisma } from '~/config/database';
import { ApiErrorCode } from '~/constants/errorCodes';
import { ActionError } from '~/errors/action.error';

export interface UserProfile {
  createdAt: null | number;
  email: string;
  id: string;
  name: string;
  teams: UserTeamProfile[];
  updatedAt: null | number;
}

interface UserTeamProfile {
  id: string;
  isOwner: boolean;
  joinedAt: null | number;
  name: string;
  role: PrismaRole;
  slug: string;
  ticketPrefixNumber: null | string;
}

const excludePasswordFromUser = (user: User): Omit<User, 'password'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export const getUserProfileById = async (userId: string): Promise<UserProfile> => {
  const userWithTeams = await prisma.user.findUnique({
    include: {
      teamMemberships: {
        include: {
          team: true,
        },
      },
    },
    where: {
      id: userId,
    },
  });

  if (!userWithTeams) {
    throw new ActionError('Pengguna tidak ditemukan.', ApiErrorCode.ACTION_USER_NOT_FOUND);
  }

  const userProfileData = excludePasswordFromUser(userWithTeams);

  const formattedTeams: UserTeamProfile[] = userWithTeams.teamMemberships.map((membership) => ({
    id: membership.team.id,
    isOwner: membership.team.ownerId === userId,
    joinedAt: membership.joinedAt,
    name: membership.team.name,
    role: membership.role,
    slug: membership.team.slug,
    ticketPrefixNumber: membership.team.ticketPrefixNumber,
  }));

  return {
    createdAt: userProfileData.createdAt,
    email: userProfileData.email,
    id: userProfileData.id,
    name: userProfileData.name,
    teams: formattedTeams,
    updatedAt: userProfileData.updatedAt,
  };
};

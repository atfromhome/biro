import { type User } from '@prisma/client';
import { Role } from '@prisma/client';

import type { RegisterCustomerInput } from '~/dtos/auth.dto';

import { ActionError } from '~/errors/action.error';
import { hashPassword } from '~/utils/hash';
import { generateToken } from '~/utils/jwt';
import { prisma } from '~/config/database';

const excludePassword = (user: User): Omit<User, 'password'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export const registerCustomerAction = async (
  input: RegisterCustomerInput,
): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { password: plainPassword, email, name } = input;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ActionError('Email sudah terdaftar.');
  }

  const password = await hashPassword(plainPassword);

  const newUser = await prisma.user.create({
    data: {
      password,
      email,
      name,
    },
  });

  const payload = {
    email: newUser.email,
    role: Role.CUSTOMER,
    userId: newUser.id,
    name: newUser.name,
  };

  const token = generateToken(payload);

  return {
    user: excludePassword(newUser),
    token,
  };
};

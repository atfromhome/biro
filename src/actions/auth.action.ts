import { type User } from '@prisma/client';

import type { RegisterInput, LoginInput } from '~/dtos/auth.dto';

import { verifyPassword, hashPassword } from '~/utils/hash';
import { ActionError } from '~/errors/action.error';
import { generateToken } from '~/utils/jwt';
import { prisma } from '~/config/database';

const excludePassword = (user: User): Omit<User, 'password'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export const registerCustomerAction = async (
  input: RegisterInput,
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
    userId: newUser.id,
    name: newUser.name,
  };

  const token = generateToken(payload);

  return {
    user: excludePassword(newUser),
    token,
  };
};

export const loginUserAction = async (
  input: LoginInput,
): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { password, email } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ActionError('User tidak ditemukan atau kata sandi salah.');
  }

  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    throw new ActionError('User tidak ditemukan atau kata sandi salah.');
  }

  const payload = {
    email: user.email,
    userId: user.id,
    name: user.name,
  };

  const token = generateToken(payload);

  return {
    user: excludePassword(user),
    token,
  };
};

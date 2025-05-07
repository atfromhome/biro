import { type User } from '@prisma/client';

import type { LoginInput, RegisterInput } from '~/dtos/auth.dto';

import { prisma } from '~/config/database';
import { ActionError } from '~/errors/action.error';
import { hashPassword, verifyPassword } from '~/utils/hash';
import { generateToken } from '~/utils/jwt';

const excludePassword = (user: User): Omit<User, 'password'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export const registerCustomerAction = async (
  input: RegisterInput,
): Promise<{ token: string; user: Omit<User, 'password'> }> => {
  const { email, name, password: plainPassword } = input;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ActionError('Email sudah terdaftar.');
  }

  const password = await hashPassword(plainPassword);

  const newUser = await prisma.user.create({
    data: {
      createdAt: Math.floor(Date.now() / 1000),
      email,
      name,
      password,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });

  const payload = {
    email: newUser.email,
    name: newUser.name,
    userId: newUser.id,
  };

  const token = generateToken(payload);

  return {
    token,
    user: excludePassword(newUser),
  };
};

export const loginUserAction = async (
  input: LoginInput,
): Promise<{ token: string; user: Omit<User, 'password'> }> => {
  const { email, password } = input;

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
    name: user.name,
    userId: user.id,
  };

  const token = generateToken(payload);

  return {
    token,
    user: excludePassword(user),
  };
};

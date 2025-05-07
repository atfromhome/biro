import bcrypt from 'bcrypt';

import hashing from '~/config/hashing';

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, hashing.bcrypt.rounds);
};

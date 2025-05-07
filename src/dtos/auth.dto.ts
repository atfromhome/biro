import { z } from 'zod';

export const registerFormDataSchema = z.object({
  body: z.object({
    password: z
      .string({ required_error: 'Kata sandi harus diisi' })
      .trim()
      .min(6, { message: 'Kata sandi minimal 6 karakter' }),
    email: z
      .string({ required_error: 'Alamat email harus diisi' })
      .trim()
      .email({ message: 'Alamat email tidak valid' }),
    name: z
      .string({ required_error: 'Nama harus diisi' })
      .trim()
      .min(2, { message: 'Nama minimal 2 karakter' }),
  }),
});

export type RegisterInput = z.infer<typeof registerFormDataSchema>['body'];

export const loginFormDataSchema = z.object({
  body: z.object({
    password: z
      .string({ required_error: 'Kata sandi harus diisi' })
      .trim()
      .min(1, { message: 'Kata sandi harus diisi' }),
    email: z
      .string({ required_error: 'Alamat email harus diisi' })
      .trim()
      .email({ message: 'Alamat email tidak valid' }),
  }),
});

export type LoginInput = z.infer<typeof loginFormDataSchema>['body'];

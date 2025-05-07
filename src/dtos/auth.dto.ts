import { z } from 'zod';

export const registerCutomerFormDataSchema = z.object({
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

export type RegisterCustomerInput = z.infer<typeof registerCutomerFormDataSchema>['body'];

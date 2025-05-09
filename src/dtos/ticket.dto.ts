import { TicketPriority } from '@prisma/client';
import { z } from 'zod';

export const createTicketFormDataSchema = z.object({
  body: z.object({
    categoryId: z.string().trim().min(1).optional(),

    customerEmail: z
      .string({ invalid_type_error: 'Email customer harus berupa string.' })
      .trim()
      .email({ message: 'Format email customer tidak valid.' })
      .optional(),

    description: z
      .string({ required_error: 'Deskripsi tiket wajib diisi' })
      .trim()
      .min(10, { message: 'Deskripsi tiket minimal 10 karakter' }),

    labelIds: z.array(z.string().trim().min(1)).optional(),
    priority: z
      .nativeEnum(TicketPriority, {
        errorMap: () => ({
          message: 'Prioritas tidak valid. Gunakan LOW, MEDIUM, HIGH, atau URGENT',
        }),
      })
      .optional(),
    subject: z
      .string({ required_error: 'Subjek tiket wajib diisi' })
      .trim()
      .min(10, { message: 'Subjek tiket minimal 10 karakter' })
      .max(100, { message: 'Subjek tiket maksimal 100 karakter' }),
  }),
  params: z.object({
    teamId: z
      .string({ required_error: 'Team ID pada path URL wajib diisi.' })
      .trim()
      .min(1, 'Team ID pada path URL tidak boleh kosong.'),
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketFormDataSchema>['body'];
export type CreateTicketParams = z.infer<typeof createTicketFormDataSchema>['params'];

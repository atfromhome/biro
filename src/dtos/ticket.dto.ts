import { TicketPriority, TicketStatus } from '@prisma/client';
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

export const getTicketsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).optional().default(15),
    page: z.coerce.number().int().min(1).optional().default(1),
    priority: z
      .nativeEnum(TicketPriority, {
        errorMap: () => ({ message: 'Prioritas filter tidak valid.' }),
      })
      .optional(),
    q: z.string().trim().optional(),
    sortBy: z
      .enum(['created_at', 'updated_at', 'priority', 'status', 'subject'])
      .optional()
      .default('created_at'),
    sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
    status: z
      .nativeEnum(TicketStatus, {
        errorMap: () => ({ message: 'Status filter tidak valid' }),
      })
      .optional(),
    teamId: z.string().trim().min(1).optional(),
  }),
});

export type GetTicketsQueryInput = z.infer<typeof getTicketsQuerySchema>['query'];

export interface PaginatedTicketsResponse {
  currentPage: number;
  data: TicketListItemOutput[];
  limit: number;
  totalPages: number;
  totalTickets: number;
}

export interface TicketListItemOutput {
  category?: { id: string; name: string } | null;
  createdAt: null | number;
  id: string;
  labels?: { color: string; id: string; name: string }[];
  number: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  team: {
    id: string;
    name: string;
    slug: string;
    ticketPrefixNumber: null | string;
  };
  updatedAt: null | number;
}

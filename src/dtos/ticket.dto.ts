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

export const updateTicketCoreInfoFormDataSchema = z.object({
  body: z
    .object({
      description: z
        .string({ invalid_type_error: 'Deskripsi harus berupa string' })
        .trim()
        .min(10, { message: 'Deskripsi minimal 10 karakter' })
        .optional(),
      subject: z
        .string({ invalid_type_error: 'Subjek harus berupa string' })
        .trim()
        .min(10, { message: 'Subjek minimal 10 karakter' })
        .max(100, { message: 'Subjek maksimal 100 karakter' })
        .optional(),
    })
    .refine((data) => data.subject !== undefined || data.description !== undefined, {
      message:
        'Setidaknya satu field (subject atau description) harus diisi untuk melakukan update',
    }),

  params: z.object({
    teamId: z
      .string({ required_error: 'Team ID pada path URL wajib diisi.' })
      .trim()
      .min(1, 'Team ID pada path URL tidak boleh kosong.'),
    ticketId: z
      .string({ required_error: 'Ticket ID pada path URL wajib diisi.' })
      .trim()
      .min(1, 'Ticket ID pada path URL tidak boleh kosong.'),
  }),
});

export type UpdateTicketCoreInput = z.infer<typeof updateTicketCoreInfoFormDataSchema>['body'];
export type UpdateTicketParams = z.infer<typeof updateTicketCoreInfoFormDataSchema>['params'];

export const getTicketDetailParamsSchema = z.object({
  params: z.object({
    teamId: z
      .string({ required_error: 'Team ID pada path URL wajib diisi.' })
      .trim()
      .min(1, 'Team ID pada path URL tidak boleh kosong.'),
    ticketId: z
      .string({ required_error: 'Ticket ID pada path URL wajib diisi.' })
      .trim()
      .min(1, 'Ticket ID pada path URL tidak boleh kosong.'),
  }),
});

export type GetTicketDetailParams = z.infer<typeof getTicketDetailParamsSchema>['params'];

export interface TicketDetailOutput {
  assignedAgent?: null | TicketUserOutput;
  category?: {
    id: string;
    name: string;
  } | null;
  closedAt: null | number;
  commentCount: number;
  createdAt: null | number;
  creator: TicketUserOutput;
  description: string;
  id: string;
  labels: {
    color: string;
    id: string;
    name: string;
  }[];
  number: string;
  priority: TicketPriority;
  resolvedAt: null | number;
  status: TicketStatus;
  subject: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  updatedAt: null | number;
}

interface TicketUserOutput {
  id: string;
  name: string;
}

export const ticketActionParamsSchema = z.object({
  params: z.object({
    teamId: z
      .string({ required_error: 'ID Tim pada path wajib diisi.' })
      .trim()
      .min(1, 'ID Tim pada path tidak boleh kosong.'),
    ticketId: z
      .string({ required_error: 'ID Tiket pada path wajib diisi.' })
      .trim()
      .min(1, 'ID Tiket pada path tidak boleh kosong.'),
  }),
});
export type TicketActionParams = z.infer<typeof ticketActionParamsSchema>['params'];

export const updateTicketPriorityBodySchema = z.object({
  body: z.object({
    priority: z.nativeEnum(TicketPriority, {
      invalid_type_error: 'Prioritas tidak valid. Gunakan LOW, MEDIUM, HIGH, atau URGENT.',
      required_error: 'Prioritas wajib diisi.', // Jika PUT, maka field ini wajib
    }),
  }),
});

export const updateTicketPriorityFormDataSchema = ticketActionParamsSchema.merge(
  updateTicketPriorityBodySchema,
);
export type UpdateTicketPriorityInput = z.infer<typeof updateTicketPriorityFormDataSchema>['body'];

export const updateTicketCategoryBodySchema = z.object({
  body: z.object({
    categoryId: z
      .string({
        invalid_type_error: 'ID Kategori harus berupa string atau null.',
        required_error: 'ID Kategori wajib diisi jika diisi.',
      })
      .trim()
      .min(1, 'ID Kategori tidak boleh string kosong jika diisi.')
      .nullable(),
  }),
});

export const updateTicketCategoryFormDataSchema = ticketActionParamsSchema.merge(
  updateTicketCategoryBodySchema,
);
export type UpdateTicketCategoryInput = z.infer<typeof updateTicketCategoryBodySchema>['body'];
export type UpdateTicketCategoryParams = TicketActionParams;

import { z } from 'zod';

export const getTicketCommentsParamsSchema = z.object({
  params: z.object({
    teamId: z.string({ required_error: 'ID Tim pada path wajib diisi.' }).trim().min(1),
    ticketId: z.string({ required_error: 'ID Tiket pada path wajib diisi.' }).trim().min(1),
  }),
});
export type GetTicketCommentsParams = z.infer<typeof getTicketCommentsParamsSchema>['params'];

export const getTicketCommentsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).optional().default(15),
    page: z.coerce.number().int().positive().optional().default(1),
    sortBy: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
});

export interface CommentListItemOutput {
  author: CommentAuthorOutput;
  content: string;
  createdAt: null | number;
  id: string;
  isInternalNote: boolean;
  updatedAt: null | number;
}

export type GetTicketCommentsQueryInput = z.infer<typeof getTicketCommentsQuerySchema>['query'];

export interface PaginatedCommentsResponse {
  currentPage: number;
  data: CommentListItemOutput[];
  limit: number;
  totalComments: number;
  totalPages: number;
}

interface CommentAuthorOutput {
  id: string;
  name: string;
}

import { Router } from 'express';

import { createTicketHandler } from '~/controllers/ticket.controller';
import { createTicketFormDataSchema } from '~/dtos/ticket.dto'; // Skema DTO tiket
import { authenticateRequest } from '~/middlewares/auth.middleware'; // Middleware autentikasi
import { validateRequest } from '~/middlewares/validate.middleware'; // Middleware validasi

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticateRequest,
  validateRequest(createTicketFormDataSchema),
  createTicketHandler,
);

export default router;

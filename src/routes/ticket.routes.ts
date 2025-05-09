import { Router } from 'express';

import { createTicketHandler, updateTicketCoreInfoHandler } from '~/controllers/ticket.controller';
import { createTicketFormDataSchema, updateTicketCoreInfoFormDataSchema } from '~/dtos/ticket.dto'; // Skema DTO tiket
import { authenticateRequest } from '~/middlewares/auth.middleware'; // Middleware autentikasi
import { validateRequest } from '~/middlewares/validate.middleware'; // Middleware validasi

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticateRequest,
  validateRequest(createTicketFormDataSchema),
  createTicketHandler,
);

router.patch(
  '/:ticketId',
  authenticateRequest,
  validateRequest(updateTicketCoreInfoFormDataSchema),
  updateTicketCoreInfoHandler,
);

export default router;

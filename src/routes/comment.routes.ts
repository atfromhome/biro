import { Router } from 'express';

import { getTicketCommentsHandler } from '~/controllers/comment.controller';
import { getTicketCommentsParamsSchema, getTicketCommentsQuerySchema } from '~/dtos/comment.dto';
import { authenticateRequest } from '~/middlewares/auth.middleware';
import { validateRequest } from '~/middlewares/validate.middleware';

const router = Router({ mergeParams: true });

router.use(authenticateRequest);

router.get(
  '/',
  validateRequest(getTicketCommentsParamsSchema.merge(getTicketCommentsQuerySchema)),
  getTicketCommentsHandler,
);

export default router;

import { Router } from 'express';

import {
  createTicketHandler,
  getTicketDetailHandler,
  updateTicketCategoryHandler,
  updateTicketCoreInfoHandler,
  updateTicketPriorityHandler,
} from '~/controllers/ticket.controller';
import {
  createTicketFormDataSchema,
  getTicketDetailParamsSchema,
  updateTicketCategoryFormDataSchema,
  updateTicketCoreInfoFormDataSchema,
  updateTicketPriorityFormDataSchema,
} from '~/dtos/ticket.dto';
import { authenticateRequest } from '~/middlewares/auth.middleware';
import { validateRequest } from '~/middlewares/validate.middleware';

import commentRouter from './comment.routes';

const router = Router({ mergeParams: true });

router.use(authenticateRequest);

router.post('/', validateRequest(createTicketFormDataSchema), createTicketHandler);
router.get('/:ticketId', validateRequest(getTicketDetailParamsSchema), getTicketDetailHandler);

router.patch(
  '/:ticketId',
  validateRequest(updateTicketCoreInfoFormDataSchema),
  updateTicketCoreInfoHandler,
);

router.put(
  '/:ticketId/priority',
  validateRequest(updateTicketPriorityFormDataSchema),
  updateTicketPriorityHandler,
);

router.put(
  '/:ticketId/category',
  validateRequest(updateTicketCategoryFormDataSchema),
  updateTicketCategoryHandler,
);

router.use('/:ticketId/comments', commentRouter);

export default router;

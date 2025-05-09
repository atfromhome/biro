import { Router } from 'express';

import { getMyTicketsHandler, getUserProfileHandler } from '~/controllers/user.controller';
import { getTicketsQuerySchema } from '~/dtos/ticket.dto';
import { authenticateRequest } from '~/middlewares/auth.middleware';
import { validateRequest } from '~/middlewares/validate.middleware';

const router = Router();

router.use(authenticateRequest);

router.get('/me/profile', getUserProfileHandler);
router.get('/me/tickets', validateRequest(getTicketsQuerySchema), getMyTicketsHandler);

export default router;

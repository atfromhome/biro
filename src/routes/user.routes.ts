import { Router } from 'express';

import { getUserProfileHandler } from '~/controllers/user.controller';
import { authenticateRequest } from '~/middlewares/auth.middleware';

const router = Router();

router.use(authenticateRequest);

router.get('/me/profile', authenticateRequest, getUserProfileHandler);

export default router;

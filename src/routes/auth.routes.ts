import { Router } from 'express';

import { registerCustomerHandler } from '~/controllers/auth.controller';
import { validateRequest } from '~/middlewares/validate.middleware';
import { registerCutomerFormDataSchema } from '~/dtos/auth.dto';

const router = Router();

router.post(
  '/customer/register',
  validateRequest(registerCutomerFormDataSchema),
  registerCustomerHandler,
);

export default router;

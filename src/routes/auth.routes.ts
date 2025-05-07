import { Router } from 'express';

import { registerCustomerHandler, loginUserHandler } from '~/controllers/auth.controller';
import { registerFormDataSchema, loginFormDataSchema } from '~/dtos/auth.dto';
import { validateRequest } from '~/middlewares/validate.middleware';

const router = Router();

router.post('/register', validateRequest(registerFormDataSchema), registerCustomerHandler);

router.post('/login', validateRequest(loginFormDataSchema), loginUserHandler);

export default router;

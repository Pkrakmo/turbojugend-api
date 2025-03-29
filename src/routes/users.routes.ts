import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';

const router = Router();
const usersController = new UsersController();

router.post('/create', usersController.createUser);
router.delete('/:identifier', usersController.deleteUser);
router.get('/get-user-id', usersController.getUserIDByGoogleUserId);

export default router; 
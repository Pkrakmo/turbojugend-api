import { Router } from 'express';
import { MembershipsController } from '../controllers/memberships.controller';

const router = Router();
const membershipsController = new MembershipsController();

router.post('/create', membershipsController.createMembership);
router.get('/chapters/:id', membershipsController.getMembershipsByChapter);
router.get('/users/:id', membershipsController.getMembershipsByUser);
router.get('/check-warrior-name', membershipsController.checkWarriorNameAvailability);

export default router; 
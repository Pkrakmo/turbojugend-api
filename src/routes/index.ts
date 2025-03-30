import express from 'express';
import chapterRoutes from './chapters.routes';
import userRoutes from './users.routes';
import membershipRoutes from './memberships.routes';

const router = express.Router();

// Use routes
router.use('/chapters', chapterRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);

export default router; 
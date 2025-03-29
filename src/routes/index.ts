import express from 'express';
import chapterRoutes from './chapters.routes';
import userRoutes from './users.routes';

const router = express.Router();

// Use routes
router.use('/chapters', chapterRoutes);
router.use('/users', userRoutes);

export default router; 
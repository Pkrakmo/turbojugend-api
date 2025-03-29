import { Router } from 'express';
import { ChaptersController } from '../controllers/chapters.controller';
import { validate, chapterValidationRules } from '../middleware/validation';

const router = Router();
const chaptersController = new ChaptersController();

// GET /api/chapters
router.get('/', chaptersController.getChapters);

// GET /api/chapters/count
router.get('/count', chaptersController.getChapterCount);

// GET /api/chapters/check-name
router.get('/check-name', chaptersController.checkChapterName);

// GET /api/chapters/:id
router.get('/:id', chaptersController.getChapterById);

// POST /api/chapters
router.post('/', chapterValidationRules, validate, chaptersController.createChapter);

export default router; 
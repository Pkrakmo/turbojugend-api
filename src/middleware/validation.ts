import { Request, Response, NextFunction } from 'express';
import { validationResult, body } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const chapterValidationRules = [
  body('Chapter_Name').trim().notEmpty().withMessage('Chapter name is required'),
  body('Chapter_Description').trim().notEmpty().withMessage('Chapter description is required'),
  body('Created_By').trim().notEmpty().withMessage('Created by is required'),
];
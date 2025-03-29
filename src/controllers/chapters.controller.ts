import { Request, Response } from 'express';
import { Client } from '@libsql/client';
import { ChapterModel } from '../models/chapters';

export class ChaptersController {
    constructor() {
        // Bind all methods to this instance
        this.getChapters = this.getChapters.bind(this);
        this.getChapterCount = this.getChapterCount.bind(this);
        this.checkChapterName = this.checkChapterName.bind(this);
        this.createChapter = this.createChapter.bind(this);
        this.getChapterById = this.getChapterById.bind(this);
    }

    // Function to generate a random 6-digit string with lowercase letters
    private generateChapterId(): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async getChapters(req: Request, res: Response) {
        try {
            const db = req.app.locals.db as Client;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = (page - 1) * limit;
            
            // Get total count of chapters
            const countResult = await db.execute('SELECT COUNT(*) as total FROM chapters');
            const total = Number(countResult.rows[0].total);
            
            // Get paginated chapters
            const chapters = await db.execute({
                sql: `SELECT Chapter_Id, Chapter_Name 
                    FROM chapters 
                    ORDER BY Chapter_Name 
                    LIMIT ? OFFSET ?`,
                args: [limit, offset]
            });

            res.status(200).json({
                chapters: chapters.rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching chapters:', error);
            res.status(500).json({ error: 'Failed to fetch chapters' });
        }
    }

    async getChapterCount(req: Request, res: Response) {
        try {
            const db = req.app.locals.db as Client;
            const result = await db.execute('SELECT COUNT(*) as total FROM chapters');
            res.status(200).json({ total: Number(result.rows[0].total) });
        } catch (error) {
            console.error('Error getting chapter count:', error);
            res.status(500).json({ error: 'Failed to get chapter count' });
        }
    }

    async checkChapterName(req: Request, res: Response): Promise<void> {
        try {
            const { Chapter_Name } = req.query;

            if (!Chapter_Name) {
                res.status(400).json({ error: 'Chapter name is required' });
                return;
            }

            const result = await req.app.locals.db.execute({
                sql: 'SELECT Chapter_Name FROM chapters WHERE LOWER(Chapter_Name) = LOWER(?)',
                args: [Chapter_Name]
            });

            if (result.rows.length > 0) {
                res.status(200).json({
                    exists: true,
                    message: 'Chapter name already exists'
                });
            } else {
                res.status(200).json({
                    exists: false,
                    message: 'Chapter name is available'
                });
            }
        } catch (error) {
            console.error('Error checking chapter name:', error);
            res.status(500).json({ error: 'Failed to check chapter name' });
        }
    }

    async createChapter(req: Request, res: Response) {
        try {
            const { Chapter_Name, Chapter_Description, Created_By } = req.body;
            const db = req.app.locals.db as Client;

            // Generate a unique Chapter_Id
            const Chapter_Id = this.generateChapterId();

            // Check if Chapter_Name already exists (case-insensitive)
            const existingName = await db.execute(
                'SELECT Chapter_Name FROM chapters WHERE LOWER(Chapter_Name) = LOWER(?)',
                [Chapter_Name]
            );

            if (existingName.rows.length > 0) {
                return res.status(400).json({ error: 'Chapter name already exists (case-insensitive)' });
            }

            // Check if Chapter_Id already exists (though unlikely due to random generation)
            const existingId = await db.execute(
                'SELECT Chapter_Id FROM chapters WHERE Chapter_Id = ?',
                [Chapter_Id]
            );

            if (existingId.rows.length > 0) {
                // If by chance the generated ID exists, generate a new one
                const newChapterId = this.generateChapterId();
                return res.status(400).json({ error: 'Generated chapter ID already exists, please try again' });
            }

            // Get the last ID to increment
            const lastChapter = await db.execute(
                'SELECT ID FROM chapters ORDER BY ID DESC LIMIT 1'
            );
            
            // Parse the last ID as a number and increment it, or start at 1 if no chapters exist
            const lastId = lastChapter.rows.length > 0 ? Number(lastChapter.rows[0].ID) : 0;
            const nextId = lastId + 1;

            // Create new chapter
            const chapter = new ChapterModel({
                ID: nextId,
                Chapter_Id,
                Chapter_Name,
                Chapter_Description,
                Created_By,
                Status: 'pending',
                CreatedAt: new Date(),
                UpdatedAt: new Date()
            });

            // Insert into database
            await db.execute({
                sql: `INSERT INTO chapters (
                    ID, Chapter_Id, Chapter_Name, Chapter_Description, 
                    Created_By, Status, CreatedAt, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    chapter.ID,
                    chapter.Chapter_Id,
                    chapter.Chapter_Name,
                    chapter.Chapter_Description,
                    chapter.Created_By,
                    chapter.Status,
                    chapter.CreatedAt.toISOString(),
                    chapter.UpdatedAt.toISOString()
                ]
            });

            res.status(201).json(chapter);
        } catch (error) {
            console.error('Error creating chapter:', error);
            res.status(500).json({ error: 'Failed to create chapter' });
        }
    }

    async getChapterById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db as Client;

            if (!id) {
                return res.status(400).json({
                    error: 'Chapter ID is required'
                });
            }

            const result = await db.execute({
                sql: `SELECT 
                    ID, Chapter_Id, Chapter_Name, Chapter_Description, 
                    Created_By, Status, CreatedAt, UpdatedAt
                    FROM chapters 
                    WHERE Chapter_Id = ?`,
                args: [id]
            });

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'Chapter not found'
                });
            }

            const chapter = result.rows[0];
            res.status(200).json({
                success: true,
                data: {
                    ID: chapter.ID,
                    Chapter_Id: chapter.Chapter_Id,
                    Chapter_Name: chapter.Chapter_Name,
                    Chapter_Description: chapter.Chapter_Description,
                    Created_By: chapter.Created_By,
                    Status: chapter.Status,
                    CreatedAt: new Date(String(chapter.CreatedAt)),
                    UpdatedAt: new Date(String(chapter.UpdatedAt))
                }
            });
        } catch (error) {
            console.error('Error fetching chapter:', error);
            res.status(500).json({ error: 'Failed to fetch chapter' });
        }
    }
} 
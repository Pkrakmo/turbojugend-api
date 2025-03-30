import { Request, Response } from 'express';
import { Client } from '@libsql/client';
import { MembershipModel } from '../models/memberships';

/**
 * Controller handling all membership-related operations
 * Manages the creation and retrieval of memberships across chapters
 */
export class MembershipsController {
    constructor() {
        // Bind methods to maintain correct 'this' context
        this.createMembership = this.createMembership.bind(this);
        this.getMembershipsByChapter = this.getMembershipsByChapter.bind(this);
        this.getMembershipsByUser = this.getMembershipsByUser.bind(this);
        this.checkWarriorNameAvailability = this.checkWarriorNameAvailability.bind(this);
    }

    /**
     * Creates a new membership for a user in a chapter
     * Validates user existence, chapter existence, and warrior name uniqueness
     * Sets default values for rank and status if not provided
     * 
     * @param req Request containing User_ID, Chapter_Id, Chapter_Rank (optional), and Warrior_Name
     * @param res Response object to send back the created membership or error
     */
    async createMembership(req: Request, res: Response) {
        try {
            const { User_ID, Chapter_Id, Chapter_Rank, Warrior_Name } = req.body;
            const db = req.app.locals.db as Client;

            // Validate required fields - ensures all necessary data is provided
            if (!User_ID || !Chapter_Id || !Warrior_Name) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: User_ID, Chapter_Id, and Warrior_Name are required'
                });
            }

            // Verify the user exists in the system before creating membership
            const userExists = await db.execute({
                sql: 'SELECT ID FROM users WHERE User_ID = ?',
                args: [User_ID]
            });

            if (userExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify the chapter exists in the system
            const chapterExists = await db.execute({
                sql: 'SELECT Chapter_Id FROM chapters WHERE Chapter_Id = ?',
                args: [Chapter_Id]
            });

            if (chapterExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            // Prevent duplicate memberships - a user can only be a member of a chapter once
            const existingMembership = await db.execute({
                sql: 'SELECT * FROM memberships WHERE User_ID = ? AND Chapter_Id = ?',
                args: [User_ID, Chapter_Id]
            });

            if (existingMembership.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User is already a member of this chapter'
                });
            }

            // Ensure warrior name uniqueness across all chapters (case-insensitive)
            const existingWarriorName = await db.execute({
                sql: 'SELECT Warrior_Name FROM memberships WHERE LOWER(Warrior_Name) = LOWER(?)',
                args: [Warrior_Name]
            });

            if (existingWarriorName.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Warrior name is already taken'
                });
            }

            // Create new membership with default values if not provided
            const membership = new MembershipModel({
                User_ID,
                Chapter_Id,
                Chapter_Rank: Chapter_Rank || 'member', // Default to 'member' if not specified
                Warrior_Name,
                Chapter_Status: 'pending' // Default status for new memberships
            });

            // Insert the new membership into the database
            const result = await db.execute({
                sql: `
                    INSERT INTO memberships (
                        User_ID, Chapter_Id, Chapter_Rank, Chapter_Status,
                        Warrior_Name, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    membership.User_ID,
                    membership.Chapter_Id,
                    membership.Chapter_Rank,
                    membership.Chapter_Status,
                    membership.Warrior_Name,
                    membership.CreatedAt.toISOString(),
                    membership.UpdatedAt.toISOString()
                ]
            });

            // Retrieve the newly created membership to return to the client
            const createdMembership = await db.execute({
                sql: 'SELECT * FROM memberships WHERE User_ID = ? AND Chapter_Id = ?',
                args: [User_ID, Chapter_Id]
            });

            return res.status(201).json({
                success: true,
                data: createdMembership.rows[0]
            });

        } catch (error) {
            console.error('Error creating membership:', error);
            return res.status(500).json({
                success: false,
                message: 'Error creating membership'
            });
        }
    }

    /**
     * Retrieves all memberships for a specific chapter
     * Returns memberships sorted alphabetically by warrior name
     * 
     * @param req Request containing chapter ID in params
     * @param res Response object to send back the memberships or error
     */
    async getMembershipsByChapter(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db as Client;

            // Validate chapter ID presence
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Chapter ID is required'
                });
            }

            // Verify the chapter exists before fetching memberships
            const chapterExists = await db.execute({
                sql: 'SELECT Chapter_Id FROM chapters WHERE Chapter_Id = ?',
                args: [id]
            });

            if (chapterExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            // Fetch all memberships for the chapter, ordered alphabetically
            const memberships = await db.execute({
                sql: `
                    SELECT 
                        m.*
                    FROM memberships m
                    WHERE m.Chapter_Id = ?
                    ORDER BY m.Warrior_Name
                `,
                args: [id]
            });

            return res.status(200).json({
                success: true,
                data: memberships.rows
            });

        } catch (error) {
            console.error('Error fetching chapter memberships:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching chapter memberships'
            });
        }
    }

    /**
     * Retrieves all memberships for a specific user
     * Includes additional chapter information (name and description)
     * Returns memberships sorted alphabetically by chapter name
     * 
     * @param req Request containing user ID in params
     * @param res Response object to send back the memberships or error
     */
    async getMembershipsByUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const db = req.app.locals.db as Client;

            // Validate user ID presence
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            // Verify the user exists before fetching memberships
            const userExists = await db.execute({
                sql: 'SELECT User_ID FROM users WHERE User_ID = ?',
                args: [id]
            });

            if (userExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Fetch all memberships for the user with additional chapter details
            // Joins with chapters table to get chapter information
            const memberships = await db.execute({
                sql: `
                    SELECT 
                        m.*,
                        c.Chapter_Name,
                        c.Chapter_Description
                    FROM memberships m
                    JOIN chapters c ON m.Chapter_Id = c.Chapter_Id
                    WHERE m.User_ID = ?
                    ORDER BY c.Chapter_Name
                `,
                args: [id]
            });

            return res.status(200).json({
                success: true,
                data: memberships.rows
            });

        } catch (error) {
            console.error('Error fetching user memberships:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching user memberships'
            });
        }
    }

    /**
     * Checks if a warrior name is available across all chapters
     * Performs case-insensitive check to ensure uniqueness
     * 
     * @param req Request containing warriorName in query params
     * @param res Response object to send back the availability status or error
     */
    async checkWarriorNameAvailability(req: Request, res: Response) {
        try {
            const warriorName = req.query.warriorName as string;
            const db = req.app.locals.db as Client;

            // Validate warrior name presence
            if (!warriorName) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required field: warriorName is required'
                });
            }

            // Check if warrior name exists anywhere in the system (case-insensitive)
            const existingWarriorName = await db.execute({
                sql: 'SELECT Warrior_Name FROM memberships WHERE LOWER(Warrior_Name) = LOWER(?)',
                args: [warriorName]
            });

            // Return availability status along with the checked name
            return res.status(200).json({
                success: true,
                data: {
                    isAvailable: existingWarriorName.rows.length === 0,
                    warriorName: warriorName
                }
            });

        } catch (error) {
            console.error('Error checking warrior name availability:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking warrior name availability'
            });
        }
    }
} 
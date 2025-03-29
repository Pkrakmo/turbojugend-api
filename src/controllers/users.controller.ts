import { Request, Response } from 'express';
import { UserModel } from '../models/users';
import { Client } from '@libsql/client';

export class UsersController {
    async createUser(req: Request, res: Response) {
        try {
            const { GoogleUserId, Email, Role } = req.body;
            const db = req.app.locals.db as Client;

            // Validate required fields
            if (!GoogleUserId || !Email || !Role) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: GoogleUserId, Email, and Role are required'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(Email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }

            // Check if user already exists
            const existingUser = await db.execute({
                sql: 'SELECT * FROM users WHERE Email = ? OR GoogleUserId = ?',
                args: [Email, GoogleUserId]
            });

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email or GoogleUserId already exists'
                });
            }

            // Create new user
            const user = new UserModel({
                GoogleUserId,
                Email,
                Role,
                Status: 'pending'
            });

            // Insert into database
            const result = await db.execute({
                sql: `
                    INSERT INTO users (
                        User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    user.User_ID,
                    user.GoogleUserId,
                    user.Email,
                    user.Role,
                    user.Status,
                    user.CreatedAt,
                    user.UpdatedAt
                ]
            });

            // Get the inserted user with auto-incremented ID
            const createdUser = await db.execute({
                sql: 'SELECT * FROM users WHERE User_ID = ?',
                args: [user.User_ID]
            });

            return res.status(201).json({
                success: true,
                data: {
                    ID: createdUser.rows[0].ID,
                    User_ID: createdUser.rows[0].User_ID,
                    GoogleUserId: createdUser.rows[0].GoogleUserId,
                    Email: createdUser.rows[0].Email,
                    Role: createdUser.rows[0].Role,
                    Status: createdUser.rows[0].Status,
                    CreatedAt: createdUser.rows[0].CreatedAt,
                    UpdatedAt: createdUser.rows[0].UpdatedAt
                }
            });

        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({
                success: false,
                message: 'Error creating user'
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const identifier = req.params.identifier;
            const db = req.app.locals.db as Client;

            // Check if identifier is an email, GoogleUserId, or User_ID
            let query = '';
            let args = [identifier];

            if (identifier.includes('@')) {
                // Email
                query = 'Email = ?';
            } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
                // UUID format (User_ID)
                query = 'User_ID = ?';
            } else {
                // GoogleUserId
                query = 'GoogleUserId = ?';
            }

            // Check if user exists
            const existingUser = await db.execute({
                sql: `SELECT * FROM users WHERE ${query}`,
                args
            });

            if (existingUser.rows.length === 0) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            // Delete the user
            await db.execute({
                sql: `DELETE FROM users WHERE ${query}`,
                args
            });

            return res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error while deleting user'
            });
        }
    }

    async getUserIDByGoogleUserId(req: Request, res: Response) {
        try {
            const GoogleUserId = req.query.GoogleUserId as string;
            const db = req.app.locals.db as Client;

            if (!GoogleUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'GoogleUserId is required'
                });
            }

            const result = await db.execute({
                sql: 'SELECT User_ID FROM users WHERE GoogleUserId = ?',
                args: [GoogleUserId]
            });

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    User_ID: result.rows[0].User_ID
                }
            });

        } catch (error) {
            console.error('Error getting User_ID:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting User_ID'
            });
        }
    }
} 
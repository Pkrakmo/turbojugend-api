import request from 'supertest';
import { app } from '../app';
import { Client } from '@libsql/client';
import { setupTestDatabase, cleanupTestDatabase } from './setup';

describe('Memberships API', () => {
    let db: Client;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        db = await setupTestDatabase();
        app.locals.db = db;
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

    beforeEach(async () => {
        // Clear the memberships table before each test
        await db.execute('DELETE FROM memberships');
        // Clear the users and chapters tables as well since they're referenced
        await db.execute('DELETE FROM users');
        await db.execute('DELETE FROM chapters');
    });

    describe('POST /api/memberships/create', () => {
        it('should create a new membership successfully', async () => {
            // First create a user and chapter
            const user = {
                GoogleUserId: 'test-google-id',
                Email: 'test@example.com',
                Role: 'user'
            };
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', user.GoogleUserId, user.Email, user.Role, 'active', new Date().toISOString(), new Date().toISOString()]
            });

            const chapter = {
                Chapter_Id: 'test-chapter-id',
                Chapter_Name: 'Test Chapter',
                Chapter_Description: 'Test Description',
                Created_By: 'test-user-id'
            };
            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [chapter.Chapter_Id, chapter.Chapter_Name, chapter.Chapter_Description, chapter.Created_By, 'active', new Date().toISOString(), new Date().toISOString()]
            });

            const membershipData = {
                User_ID: 'test-user-id',
                Chapter_Id: 'test-chapter-id',
                Chapter_Rank: 'member',
                Warrior_Name: 'TestWarrior'
            };

            const response = await request(app)
                .post('/api/memberships/create')
                .send(membershipData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                User_ID: membershipData.User_ID,
                Chapter_Id: membershipData.Chapter_Id,
                Chapter_Rank: membershipData.Chapter_Rank,
                Warrior_Name: membershipData.Warrior_Name,
                Chapter_Status: 'pending'
            });
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/memberships/create')
                .send({
                    User_ID: 'test-user-id'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Missing required fields');
        });

        it('should return 404 if user does not exist', async () => {
            const response = await request(app)
                .post('/api/memberships/create')
                .send({
                    User_ID: 'non-existent-user',
                    Chapter_Id: 'test-chapter-id',
                    Warrior_Name: 'TestWarrior'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not found');
        });

        it('should return 404 if chapter does not exist', async () => {
            // Create a user first
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            const response = await request(app)
                .post('/api/memberships/create')
                .send({
                    User_ID: 'test-user-id',
                    Chapter_Id: 'non-existent-chapter',
                    Warrior_Name: 'TestWarrior'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Chapter not found');
        });

        it('should return 400 if user is already a member of the chapter', async () => {
            // Create a user and chapter
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id', 'Test Chapter', 'Test Description', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            // Create initial membership
            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-chapter-id', 'member', 'pending', 'TestWarrior', new Date().toISOString(), new Date().toISOString()]
            });

            const response = await request(app)
                .post('/api/memberships/create')
                .send({
                    User_ID: 'test-user-id',
                    Chapter_Id: 'test-chapter-id',
                    Warrior_Name: 'AnotherWarrior'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User is already a member of this chapter');
        });

        it('should return 400 if warrior name is already taken in the chapter', async () => {
            // Create a user and chapter
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id', 'Test Chapter', 'Test Description', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            // Create initial membership with the warrior name
            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-chapter-id', 'member', 'pending', 'TestWarrior', new Date().toISOString(), new Date().toISOString()]
            });

            // Create another user
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id-2', 'test-google-id-2', 'test2@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            const response = await request(app)
                .post('/api/memberships/create')
                .send({
                    User_ID: 'test-user-id-2',
                    Chapter_Id: 'test-chapter-id',
                    Warrior_Name: 'TestWarrior'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Warrior name is already taken in this chapter');
        });
    });

    describe('GET /api/memberships/chapters/:id', () => {
        it('should get all memberships for a chapter', async () => {
            // Create a user and chapter
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id', 'Test Chapter', 'Test Description', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            // Create multiple memberships
            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-chapter-id', 'member', 'pending', 'TestWarrior1', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id-2', 'test-google-id-2', 'test2@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id-2', 'test-chapter-id', 'member', 'pending', 'TestWarrior2', new Date().toISOString(), new Date().toISOString()]
            });

            const response = await request(app)
                .get('/api/memberships/chapters/test-chapter-id');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0]).toMatchObject({
                Chapter_Id: 'test-chapter-id',
                Warrior_Name: 'TestWarrior1'
            });
            expect(response.body.data[1]).toMatchObject({
                Chapter_Id: 'test-chapter-id',
                Warrior_Name: 'TestWarrior2'
            });
        });

        it('should return 404 if chapter does not exist', async () => {
            const response = await request(app)
                .get('/api/memberships/chapters/non-existent-chapter');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Chapter not found');
        });

        it('should return empty array if chapter has no memberships', async () => {
            // Create a chapter without any memberships
            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id', 'Test Chapter', 'Test Description', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()
                ]
            });

            const response = await request(app)
                .get('/api/memberships/chapters/test-chapter-id');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });
    });

    describe('GET /api/memberships/users/:id', () => {
        it('should get all memberships for a user', async () => {
            // Create a user
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            // Create multiple chapters
            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id-1', 'Test Chapter 1', 'Test Description 1', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            await db.execute({
                sql: `INSERT INTO chapters (Chapter_Id, Chapter_Name, Chapter_Description, Created_By, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-chapter-id-2', 'Test Chapter 2', 'Test Description 2', 'test-user-id', 'active', new Date().toISOString(), new Date().toISOString()]
            });

            // Create memberships for both chapters
            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-chapter-id-1', 'member', 'pending', 'TestWarrior1', new Date().toISOString(), new Date().toISOString()
                ]
            });

            await db.execute({
                sql: `INSERT INTO memberships (User_ID, Chapter_Id, Chapter_Rank, Chapter_Status, Warrior_Name, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-chapter-id-2', 'member', 'pending', 'TestWarrior2', new Date().toISOString(), new Date().toISOString()
                ]
            });

            const response = await request(app)
                .get('/api/memberships/users/test-user-id');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0]).toMatchObject({
                User_ID: 'test-user-id',
                Chapter_Id: 'test-chapter-id-1',
                Warrior_Name: 'TestWarrior1'
            });
            expect(response.body.data[1]).toMatchObject({
                User_ID: 'test-user-id',
                Chapter_Id: 'test-chapter-id-2',
                Warrior_Name: 'TestWarrior2'
            });
        });

        it('should return 404 if user does not exist', async () => {
            const response = await request(app)
                .get('/api/memberships/users/non-existent-user');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not found');
        });

        it('should return empty array if user has no memberships', async () => {
            // Create a user without any memberships
            await db.execute({
                sql: `INSERT INTO users (User_ID, GoogleUserId, Email, Role, Status, CreatedAt, UpdatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: ['test-user-id', 'test-google-id', 'test@example.com', 'user', 'active', new Date().toISOString(), new Date().toISOString()
                ]
            });

            const response = await request(app)
                .get('/api/memberships/users/test-user-id');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });
    });
}); 
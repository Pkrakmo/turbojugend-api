import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { initializeTables } from '../models';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.PORT = process.env.PORT || '3001'; // Use different port for tests 

let db: any = null;

export async function setupTestDatabase() {
    if (!db) {
        db = createClient({
            url: 'file:test.db',
            authToken: process.env.DATABASE_AUTH_TOKEN
        });

        // Initialize tables
        await initializeTables(db);
    }

    // Clear all tables before each test
    await db.execute('DELETE FROM memberships');
    await db.execute('DELETE FROM chapters');
    await db.execute('DELETE FROM users');

    return db;
}

export async function cleanupTestDatabase() {
    if (db) {
        // Drop all tables
        await db.execute('DROP TABLE IF EXISTS memberships');
        await db.execute('DROP TABLE IF EXISTS chapters');
        await db.execute('DROP TABLE IF EXISTS users');
    }
} 
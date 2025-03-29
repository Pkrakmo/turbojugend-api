import { createClient, Client } from '@libsql/client';
import { initializeTables } from '../models';

let db: Client | null = null;

export const initializeDatabase = async (): Promise<Client> => {
  try {
    // Initialize Turso client
    db = createClient({
      url: process.env.TURSO_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    });

    // Enable foreign key constraints
    await db.execute('PRAGMA foreign_keys = ON;');

    // Initialize database tables
    await initializeTables(db);

    console.log('Database connection established');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}; 
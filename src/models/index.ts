export * from './users';
export * from './chapters';
export * from './memberships';

import { Client } from '@libsql/client';

export const initializeTables = async (db: Client): Promise<void> => {
  try {
    // Enable foreign key constraints
    await db.execute('PRAGMA foreign_keys = ON;');

    // Create users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        User_ID TEXT NOT NULL UNIQUE,
        GoogleUserId TEXT NOT NULL,
        Email TEXT NOT NULL,
        Role TEXT NOT NULL,
        Status TEXT NOT NULL DEFAULT 'pending',
        CreatedAt DATETIME NOT NULL,
        UpdatedAt DATETIME NOT NULL
      )
    `);

    // Create chapters table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chapters (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Chapter_Id TEXT NOT NULL UNIQUE,
        Chapter_Name TEXT NOT NULL,
        Chapter_Description TEXT NOT NULL,
        Created_By TEXT NOT NULL,
        Status TEXT NOT NULL DEFAULT 'pending',
        CreatedAt DATETIME NOT NULL,
        UpdatedAt DATETIME NOT NULL
      )
    `);

    // Create memberships table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS memberships (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        User_ID TEXT NOT NULL,
        Chapter_Id TEXT NOT NULL,
        Chapter_Rank TEXT NOT NULL DEFAULT 'member',
        Chapter_Status TEXT NOT NULL DEFAULT 'pending',
        Warrior_Name TEXT NOT NULL,
        CreatedAt DATETIME NOT NULL,
        UpdatedAt DATETIME NOT NULL,
        FOREIGN KEY (User_ID) REFERENCES users(User_ID),
        FOREIGN KEY (Chapter_Id) REFERENCES chapters(Chapter_Id),
        UNIQUE(User_ID, Chapter_Id)
      )
    `);

    // Check if User_ID column exists in users table
    try {
      await db.execute('SELECT User_ID FROM users LIMIT 1');
    } catch (error) {
      // If User_ID column doesn't exist, add it
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN User_ID TEXT
      `);
      
      // Update existing rows with UUIDs
      const existingUsers = await db.execute('SELECT ID FROM users WHERE User_ID IS NULL');
      for (const user of existingUsers.rows) {
        await db.execute({
          sql: 'UPDATE users SET User_ID = ? WHERE ID = ?',
          args: [crypto.randomUUID(), user.ID]
        });
      }
      
      // Make User_ID NOT NULL and UNIQUE after updating existing rows
      await db.execute(`
        ALTER TABLE users 
        ALTER COLUMN User_ID SET NOT NULL
      `);
      
      // Add UNIQUE constraint
      await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_unique ON users(User_ID)
      `);
      
      console.log('Added User_ID column to users table');
    }

    // Check if Status column exists in users table
    try {
      await db.execute('SELECT Status FROM users LIMIT 1');
    } catch (error) {
      // If Status column doesn't exist, add it
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN Status TEXT NOT NULL DEFAULT 'pending'
      `);
      console.log('Added Status column to users table');
    }

    // Check if Status column exists in chapters table
    try {
      await db.execute('SELECT Status FROM chapters LIMIT 1');
    } catch (error) {
      // If Status column doesn't exist, add it
      await db.execute(`
        ALTER TABLE chapters 
        ADD COLUMN Status TEXT NOT NULL DEFAULT 'pending'
      `);
      console.log('Added Status column to chapters table');
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}; 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Initialize database and make it available to routes
let db: any = null;

// Only initialize database if not in test environment
if (process.env.NODE_ENV !== 'test') {
    initializeDatabase()
        .then((database) => {
            db = database;
            app.locals.db = db; // Set db in app.locals immediately after initialization
            console.log('Database initialized successfully');
        })
        .catch((error) => {
            console.error('Failed to initialize database:', error);
        });
}

// Use routes
app.use('/api', routes);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.HOST || 'localhost';
        console.log(`Server is running at ${protocol}://${host}:${port}`);
    });
}

export { app, db };

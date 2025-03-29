import request from 'supertest';
import express from 'express';
import chapterRoutes from '../routes/chapters.routes';
import { validate, chapterValidationRules } from '../middleware/validation';

// Create a test app
const app = express();
app.use(express.json());

// Mock database client
const mockExecute = jest.fn();
const mockDb = {
  execute: mockExecute,
};

// Mock the database initialization
jest.mock('../config/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(mockDb)
}));

// Mock @libsql/client
jest.mock('@libsql/client', () => ({
  createClient: jest.fn().mockImplementation(() => mockDb)
}));

// Setup middleware
app.use((req, res, next) => {
  req.app.locals.db = mockDb;
  next();
});

// Setup routes after middleware
app.use('/api/chapters', chapterRoutes);

describe('Chapters Endpoints', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/chapters', () => {
    it('should return paginated chapters', async () => {
      // Mock database responses
      mockExecute
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // Count query
        .mockResolvedValueOnce({ 
          rows: [
            { Chapter_Id: 'abc123', Chapter_Name: 'Chapter 1' },
            { Chapter_Id: 'def456', Chapter_Name: 'Chapter 2' }
          ] 
        }); // Chapters query

      const response = await request(app)
        .get('/api/chapters?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('chapters');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        total: 10,
        page: 1,
        limit: 2,
        totalPages: 5
      });
    });

    it('should handle server errors', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/chapters');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch chapters');
    });
  });

  describe('GET /api/chapters/count', () => {
    it('should return total chapter count', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ total: '15' }] });

      const response = await request(app)
        .get('/api/chapters/count');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 15);
    });

    it('should handle server errors', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/chapters/count');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get chapter count');
    });
  });

  describe('GET /api/chapters/check-name', () => {
    it('should check if chapter name exists', async () => {
      const chapterName = 'Test Chapter';
      mockExecute.mockResolvedValueOnce({ rows: [{ Chapter_Name: chapterName }] });

      const response = await request(app)
        .get(`/api/chapters/check-name?Chapter_Name=${encodeURIComponent(chapterName)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exists', true);
      expect(response.body.message).toContain('already exists');
    });

    it('should return available for non-existent chapter name', async () => {
      const chapterName = 'New Chapter';
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/chapters/check-name?Chapter_Name=${encodeURIComponent(chapterName)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exists', false);
      expect(response.body.message).toContain('available');
    });

    it('should return 400 when chapter name is missing', async () => {
      const response = await request(app)
        .get('/api/chapters/check-name');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Chapter name is required');
    });

    it('should handle server errors', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/chapters/check-name?Chapter_Name=Test');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to check chapter name');
    });
  });

  describe('POST /api/chapters', () => {
    it('should create a new chapter successfully', async () => {
      const chapterData = {
        Chapter_Name: 'New Chapter',
        Chapter_Description: 'Test Description',
        Created_By: 'test-user'
      };

      mockExecute
        .mockResolvedValueOnce({ rows: [] }) // Check chapter name
        .mockResolvedValueOnce({ rows: [] }) // Check chapter ID
        .mockResolvedValueOnce({ rows: [] }) // Get last ID
        .mockResolvedValueOnce({ rows: [] }); // Insert chapter

      const response = await request(app)
        .post('/api/chapters')
        .send(chapterData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('Chapter_Id');
      expect(response.body.Chapter_Id).toMatch(/^[a-z0-9]{6}$/); // 6-digit alphanumeric
      expect(response.body).toMatchObject({
        Chapter_Name: chapterData.Chapter_Name,
        Chapter_Description: chapterData.Chapter_Description,
        Created_By: chapterData.Created_By
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/chapters')
        .send({
          Chapter_Name: 'Test Chapter'
          // Missing Chapter_Description and Created_By
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 when chapter name already exists', async () => {
      const chapterData = {
        Chapter_Name: 'Existing Chapter',
        Chapter_Description: 'Test Description',
        Created_By: 'test-user'
      };

      // Mock the database response for checking existing chapter
      mockExecute.mockResolvedValueOnce({ rows: [{ Chapter_Name: chapterData.Chapter_Name }] });

      const response = await request(app)
        .post('/api/chapters')
        .send(chapterData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Chapter name already exists (case-insensitive)');
    });

    it('should handle server errors', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/chapters')
        .send({
          Chapter_Name: 'Test Chapter',
          Chapter_Description: 'Test Description',
          Created_By: 'test-user'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to create chapter');
    });
  });
}); 
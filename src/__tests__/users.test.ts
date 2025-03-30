import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/users.routes';

// Create a test app
const app = express();
app.use(express.json());

// Mock database client
const mockDb = {
  execute: jest.fn(),
};

// Set up the database client in app.locals
app.locals.db = mockDb;

app.use('/api/users', userRoutes);

describe('Users Endpoints', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/users/create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        GoogleUserId: 'google123',
        Email: 'test@example.com',
        Role: 'user'
      };

      // Mock successful database operation
      mockDb.execute
        .mockResolvedValueOnce({ rows: [] }) // Check for existing user
        .mockResolvedValueOnce({ rows: [] }) // Insert user
        .mockResolvedValueOnce({ rows: [{ ...userData, ID: 1, Status: 'pending', CreatedAt: new Date().toISOString(), UpdatedAt: new Date().toISOString() }] }); // Get created user

      const response = await request(app)
        .post('/api/users/create')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        GoogleUserId: userData.GoogleUserId,
        Email: userData.Email,
        Role: userData.Role,
        Status: 'pending'
      });
    });

    it('should return 400 when user already exists', async () => {
      const userData = {
        GoogleUserId: 'google123',
        Email: 'test@example.com',
        Role: 'user'
      };

      // Mock existing user check
      mockDb.execute.mockResolvedValueOnce({
        rows: [{
          ID: 1,
          GoogleUserId: userData.GoogleUserId,
          Email: userData.Email,
          Role: userData.Role,
          Status: 'pending',
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        }]
      });

      const response = await request(app)
        .post('/api/users/create')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'User with this email or GoogleUserId already exists'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/users/create')
        .send({
          Email: 'test@example.com'
          // Missing GoogleUserId and Role
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 when email is invalid', async () => {
      const response = await request(app)
        .post('/api/users/create')
        .send({
          GoogleUserId: 'google123',
          Email: 'invalid-email',
          Role: 'user'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toBe('Invalid email format');
    });

    it('should handle server errors gracefully', async () => {
      // Mock a server error
      mockDb.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/users/create')
        .send({
          GoogleUserId: 'google123',
          Email: 'test@example.com',
          Role: 'user'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toBe('Error creating user');
    });
  });

  describe('DELETE /api/users/:identifier', () => {
    it('should delete a user successfully by Email', async () => {
      const email = 'test@example.com';

      // Mock successful database operation
      mockDb.execute
        .mockResolvedValueOnce({ rows: [{ ID: 1 }] }) // Check if user exists
        .mockResolvedValueOnce({ rows: [] }); // Delete user

      const response = await request(app)
        .delete(`/api/users/${email}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully'
      });
    });

    it('should delete a user successfully by GoogleUserId', async () => {
      const googleUserId = 'google123';

      // Mock successful database operation
      mockDb.execute
        .mockResolvedValueOnce({ rows: [{ ID: 1 }] }) // Check if user exists
        .mockResolvedValueOnce({ rows: [] }); // Delete user

      const response = await request(app)
        .delete(`/api/users/${googleUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully'
      });
    });

    it('should return 404 when user is not found', async () => {
      const email = 'nonexistent@example.com';

      // Mock user not found
      mockDb.execute.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/api/users/${email}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    it('should handle server errors gracefully', async () => {
      const email = 'test@example.com';

      // Mock a server error
      mockDb.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/users/${email}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Internal server error');
    });
  });
}); 
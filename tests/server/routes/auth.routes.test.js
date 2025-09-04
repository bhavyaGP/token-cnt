const express = require('express');
const request = require('supertest');
const authRouter = require('../routes/auth.routes');
const {handlelogin, handlelogout, handleregister} = require('../controllers/auth.controller'); // Mock these

jest.mock('../controllers/auth.controller');

const app = express();
app.use('/auth', authRouter);

describe('Auth Router', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /login', () => {
    it('should call handlelogin controller', async () => {
      await request(app).post('/auth/login').send({});
      expect(handlelogin).toHaveBeenCalled();
    });
  });

  describe('POST /register', () => {
    it('should call handleregister controller', async () => {
      await request(app).post('/auth/register').send({});
      expect(handleregister).toHaveBeenCalled();
    });
  });

  describe('GET /logout', () => {
    it('should call handlelogout controller', async () => {
      await request(app).get('/auth/logout');
      expect(handlelogout).toHaveBeenCalled();
    });
  });

  describe('GET /profile', () => {
    it('should return user object if authenticated', async () => {
      const mockReq = { user: { id: 1, name: 'test' } };
      const mockRes = {
        json: jest.fn(),
      };
      authRouter.stack.find(item => item.route.path === '/profile').route.handle(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ user: mockReq.user });
    });

    it('should handle errors gracefully if authentication fails', async () => {
      const mockReq = { user: null };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();
      authRouter.stack.find(item => item.route.path === '/profile').route.handle(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
        await request(app).get('/auth/invalidroute').expect(404);
    });
  });
});

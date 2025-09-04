jest.mock('jsonwebtoken');
jest.mock('../models/user.model');

const authMiddleware = require('./auth.middleware');

const { findById } = require('../models/user.model');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'testsecret';
    jwt.verify.mockClear();
    findById.mockClear();

  });

  it('should return 401 if no token is provided', async () => {
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('should return 401 if token is invalid', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => { throw new Error() });
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should return 401 if user is not found', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ userId: '123' });
    findById.mockResolvedValue(null);
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should call next if token is valid and user is found', async () => {
    req.headers.authorization = 'Bearer validtoken';
    const mockUser = { _id: '123' };
    jwt.verify.mockReturnValue({ userId: '123' });
    findById.mockResolvedValue(mockUser);
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBe(mockUser);
  });


  it('should handle token without Bearer prefix', async () => {
    req.headers.authorization = 'invalidtoken';
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('should handle empty authorization header', async () => {
    req.headers.authorization = '';
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });


  it('should handle undefined authorization header', async () => {
    delete req.headers.authorization;
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

});

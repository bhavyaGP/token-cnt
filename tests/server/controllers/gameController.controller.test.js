const User = require('../models/user.model');
const Submission = require('../models/Submission.model');
const {getLeaderboard, getPlayerStats} = require('../controllers/leaderboardController');

jest.mock('../models/user.model');
jest.mock('../models/Submission.model');

describe('getLeaderboard', () => {
  it('should return top 10 users by coins', async () => {
    const mockUsers = [{ username: 'user1', coins: 100 }, { username: 'user2', coins: 50 }];
    User.find.mockResolvedValue(mockUsers);
    const req = {};
    const res = { json: jest.fn() };
    await getLeaderboard(req, res);
    expect(res.json).toHaveBeenCalledWith(mockUsers);
  });
  it('should handle errors', async () => {
    User.find.mockRejectedValue(new Error('Failed to fetch users'));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getLeaderboard(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch leaderboard' });
  });
});

describe('getPlayerStats', () => {
  it('should return user and submissions', async () => {
    const mockUser = { _id: '1', username: 'user1', password: 'password' };
    const mockSubmissions = [{ userId: '1' }];
    User.findById.mockResolvedValue(mockUser);
    Submission.find.mockResolvedValue(mockSubmissions);
    const req = { user: { _id: '1' } };
    const res = { json: jest.fn() };
    await getPlayerStats(req, res);
    expect(res.json).toHaveBeenCalledWith({ user: { username: 'user1' }, submissions: mockSubmissions });
  });
  it('should handle errors', async () => {
    User.findById.mockRejectedValue(new Error('Failed to fetch user'));
    const req = { user: { _id: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getPlayerStats(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch player stats' });
  });
  it('should handle case where user is not found', async () => {
    User.findById.mockResolvedValue(null);
    const req = { user: { _id: '1' } };
    const res = { json: jest.fn() };
    await getPlayerStats(req, res);
    expect(res.json).toHaveBeenCalledWith({ user: null, submissions: [] });
  });
  it('should handle case where submissions are not found', async () => {
    const mockUser = { _id: '1', username: 'user1', password: 'password' };
    User.findById.mockResolvedValue(mockUser);
    Submission.find.mockResolvedValue([]);
    const req = { user: { _id: '1' } };
    const res = { json: jest.fn() };
    await getPlayerStats(req, res);
    expect(res.json).toHaveBeenCalledWith({ user: { username: 'user1' }, submissions: [] });
  });
});


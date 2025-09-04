const express = require('express');
const router = require('../router');
const gameController = require('../controllers/gameController.controller');
const authMiddleware = require('../middleware/authMiddleware');


jest.mock('../controllers/gameController.controller');
jest.mock('../middleware/authMiddleware');


describe('router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should export an express router object', () => {
    expect(typeof router).toBe('object');
    expect(router instanceof express.Router).toBe(true);
  });


  describe('GET /leaderboard', () => {
    test('should call authMiddleware and gameController.getLeaderboard', () => {
      const req = {};
      const res = {};
      router.handle({ url: '/leaderboard', method: 'GET' }, req, res, () => {});
      expect(authMiddleware).toHaveBeenCalledWith(expect.any(Function));
      expect(gameController.getLeaderboard).toHaveBeenCalled();

    });
  });

  describe('GET /player', () => {
    test('should call authMiddleware and gameController.getPlayerStats', () => {
      const req = {};
      const res = {};
      router.handle({ url: '/player', method: 'GET' }, req, res, () => {});
      expect(authMiddleware).toHaveBeenCalledWith(expect.any(Function));
      expect(gameController.getPlayerStats).toHaveBeenCalled();
    });
  });

  test('should handle other routes', () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    router.handle({ url: '/other', method: 'GET' }, req, res, next);
    expect(next).toHaveBeenCalled();
  });


});

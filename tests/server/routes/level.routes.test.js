const express = require('express');
const router = require('../router');
const levelController = require('../controllers/level.controller');
const authMiddleware = require('../middleware/authMiddleware');

jest.mock('../controllers/level.controller');
jest.mock('../middleware/authMiddleware');

describe('router', () => {
  let req, res, next;
  beforeEach(() => {
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
      send: jest.fn()
    };
    next = jest.fn();
    authMiddleware.mockImplementation((req, res, next) => next());
    levelController.getUnlockedLevels.mockResolvedValue([{id:1}]);
    levelController.getLevelById.mockResolvedValue({id:1});
    levelController.submitLevelAnswer.mockResolvedValue({id:1, success: true});
    levelController.unlockNextLevel.mockResolvedValue({id:2});
  });

  describe('GET /unlocked', () => {
    it('should call getUnlockedLevels with authMiddleware', async () => {
      await router.get('/unlocked')(req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(levelController.getUnlockedLevels).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{id:1}]);
    });
    it('should handle errors', async () => {
      levelController.getUnlockedLevels.mockRejectedValue(new Error('test error'));
      await router.get('/unlocked')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('test error');
    });
  });

  describe('GET /:levelId', () => {
    it('should call getLevelById with authMiddleware', async () => {
      req.params = { levelId: 1 };
      await router.get('/:levelId')(req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(levelController.getLevelById).toHaveBeenCalledWith(req, res, next);
      expect(res.json).toHaveBeenCalledWith({id:1});
    });
    it('should handle errors', async () => {
      req.params = { levelId: 1 };
      levelController.getLevelById.mockRejectedValue(new Error('test error'));
      await router.get('/:levelId')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('test error');
    });
  });

  describe('POST /:levelId/submit', () => {
    it('should call submitLevelAnswer with authMiddleware', async () => {
      req.params = { levelId: 1 };
      req.body = { answer: 'test' };
      await router.post('/:levelId/submit')(req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(levelController.submitLevelAnswer).toHaveBeenCalledWith(req, res, next);
      expect(res.json).toHaveBeenCalledWith({id:1, success: true});
    });
    it('should handle errors', async () => {
      req.params = { levelId: 1 };
      levelController.submitLevelAnswer.mockRejectedValue(new Error('test error'));
      await router.post('/:levelId/submit')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('test error');
    });
  });

  describe('POST /:levelId/unlock', () => {
    it('should call unlockNextLevel with authMiddleware', async () => {
      req.params = { levelId: 1 };
      await router.post('/:levelId/unlock')(req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(levelController.unlockNextLevel).toHaveBeenCalledWith(req, res, next);
      expect(res.json).toHaveBeenCalledWith({id:2});
    });
    it('should handle errors', async () => {
      req.params = { levelId: 1 };
      levelController.unlockNextLevel.mockRejectedValue(new Error('test error'));
      await router.post('/:levelId/unlock')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('test error');
    });
  });
});


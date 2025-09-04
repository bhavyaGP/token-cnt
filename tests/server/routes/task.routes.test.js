const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:level', authMiddleware, taskController.getLevelTasks);
router.post('/submit', authMiddleware, taskController.submitAnswer);

module.exports = router;

jest.mock('../controllers/task.controller');
jest.mock('../middleware/authMiddleware');

describe('router', () => {
  it('should export an express Router instance', () => {
    expect(router).toBeInstanceOf(express.Router);
  });

  describe('GET /:level', () => {
    it('should call authMiddleware and getLevelTasks with correct parameters', () => {
      const req = { params: { level: '1' } };
      const res = {};
      const next = jest.fn();
      router.handle(req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.getLevelTasks).toHaveBeenCalledWith(req, res, next);
    });
    it('should handle errors from authMiddleware', () => {
      const error = new Error('Authentication failed');
      authMiddleware.mockImplementationOnce((req, res, next) => next(error));
      const req = { params: { level: '1' } };
      const res = {};
      const next = jest.fn();
      router.handle(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors from getLevelTasks', () => {
      const error = new Error('Failed to get tasks');
      taskController.getLevelTasks.mockImplementationOnce((req, res, next) => next(error));
      const req = { params: { level: '1' } };
      const res = {};
      const next = jest.fn();
      router.handle(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

  });

  describe('POST /submit', () => {
    it('should call authMiddleware and submitAnswer with correct parameters', () => {
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle( {method: 'POST', url: '/submit'}, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.submitAnswer).toHaveBeenCalledWith(req, res, next);
    });
    it('should handle errors from authMiddleware', () => {
      const error = new Error('Authentication failed');
      authMiddleware.mockImplementationOnce((req, res, next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle( {method: 'POST', url: '/submit'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
    it('should handle errors from submitAnswer', () => {
      const error = new Error('Failed to submit answer');
      taskController.submitAnswer.mockImplementationOnce((req, res, next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle( {method: 'POST', url: '/submit'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

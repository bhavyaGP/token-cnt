jest.mock('../controllers/ai.controller');
jest.mock('../middleware/authMiddleware');
const router = require('../routes/ai.routes');
const {giveHint, solveTask} = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

describe('AI Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /giveHint', () => {
    it('should call authMiddleware and aiController.giveHint with valid request', async () => {
      const req = {};
      const res = {send: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      giveHint.mockResolvedValue({hint: 'test hint'});
      await router.handle( {method: 'POST', url: '/giveHint'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(giveHint).toHaveBeenCalledWith(req, res);
      expect(res.send).toHaveBeenCalledWith({hint: 'test hint'});
    });
    it('should handle error from aiController.giveHint', async () => {
      const req = {};
      const res = {send: jest.fn(), status: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      giveHint.mockRejectedValue(new Error('Failed to give hint'));
      await router.handle( {method: 'POST', url: '/giveHint'}, req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({error: 'Failed to give hint'});
    });
    it('should handle error from authMiddleware', async () => {
      const req = {};
      const res = {send: jest.fn(), status: jest.fn()};
      const next = jest.fn();
      authMiddleware.mockImplementation((req, res, next) => next(new Error('Auth failed')));
      await router.handle( {method: 'POST', url: '/giveHint'}, req, res, next);
      expect(next).toHaveBeenCalledWith(new Error('Auth failed'));
    });

  });

  describe('POST /solveTask', () => {
    it('should call authMiddleware and aiController.solveTask with valid request', async () => {
      const req = {};
      const res = {send: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      solveTask.mockResolvedValue({solution: 'test solution'});
      await router.handle( {method: 'POST', url: '/solveTask'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(solveTask).toHaveBeenCalledWith(req, res);
      expect(res.send).toHaveBeenCalledWith({solution: 'test solution'});
    });
    it('should handle error from aiController.solveTask', async () => {
      const req = {};
      const res = {send: jest.fn(), status: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      solveTask.mockRejectedValue(new Error('Failed to solve task'));
      await router.handle( {method: 'POST', url: '/solveTask'}, req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({error: 'Failed to solve task'});
    });
    it('should handle error from authMiddleware', async () => {
      const req = {};
      const res = {send: jest.fn(), status: jest.fn()};
      const next = jest.fn();
      authMiddleware.mockImplementation((req, res, next) => next(new Error('Auth failed')));
      await router.handle( {method: 'POST', url: '/solveTask'}, req, res, next);
      expect(next).toHaveBeenCalledWith(new Error('Auth failed'));
    });
  });
});

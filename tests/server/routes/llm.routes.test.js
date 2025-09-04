jest.mock('../controllers/ai.controller');
jest.mock('../middleware/authMiddleware');
const router = require('../routes/ai.routes');
const express = require('express');
const {askLLM, giveHintForLevel, getExplanationForLevel} = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

describe('AI Routes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/ai', router);
  });
  describe('POST /ask', () => {
    it('should call aiController.askLLM with authMiddleware', () => {
      const req = {body: {prompt: 'test'}};
      const res = {send: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      askLLM.mockImplementation((req, res) => res.send({response: 'test'}));
      app.post('/ai/ask', (req, res) => {
        authMiddleware(req, res, () => {
          askLLM(req,res);
        })
      });
      app._router.stack[0].route.stack[1].handle({body: {prompt: 'test'}}, res);
      expect(askLLM).toHaveBeenCalledWith(expect.objectContaining({body: {prompt: 'test'}}), res);
      expect(res.send).toHaveBeenCalledWith({response: 'test'});
    });
    it('should handle errors from aiController.askLLM', () => {
      const req = {body: {prompt: 'test'}};
      const res = {status: jest.fn().mockReturnThis(), send: jest.fn()};
      const err = new Error('LLM error');
      authMiddleware.mockImplementation((req, res, next) => next());
      askLLM.mockImplementation(() => {throw err;});
      app.post('/ai/ask', (req, res) => {
        authMiddleware(req, res, () => {
          askLLM(req,res);
        })
      });
      app._router.stack[0].route.stack[1].handle(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({error: 'LLM error'});
    });

  });
  describe('POST /hint/:levelId', () => {
    it('should call aiController.giveHintForLevel with authMiddleware', () => {
      const req = {params: {levelId: '1'}, body: {}};
      const res = {send: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      giveHintForLevel.mockImplementation((req, res) => res.send({hint: 'test'}));
      app.post('/ai/hint/:levelId', (req, res) => {
        authMiddleware(req, res, () => {
          giveHintForLevel(req,res);
        })
      });
      app._router.stack[0].route.stack[2].handle(req, res);
      expect(giveHintForLevel).toHaveBeenCalledWith(req, res);
      expect(res.send).toHaveBeenCalledWith({hint: 'test'});
    });
  });
  describe('POST /explanation/:levelId', () => {
    it('should call aiController.getExplanationForLevel with authMiddleware', () => {
      const req = {params: {levelId: '1'}, body: {}};
      const res = {send: jest.fn()};
      authMiddleware.mockImplementation((req, res, next) => next());
      getExplanationForLevel.mockImplementation((req, res) => res.send({explanation: 'test'}));
      app.post('/ai/explanation/:levelId', (req, res) => {
        authMiddleware(req, res, () => {
          getExplanationForLevel(req,res);
        })
      });
      app._router.stack[0].route.stack[3].handle(req, res);
      expect(getExplanationForLevel).toHaveBeenCalledWith(req, res);
      expect(res.send).toHaveBeenCalledWith({explanation: 'test'});
    });
  });
});

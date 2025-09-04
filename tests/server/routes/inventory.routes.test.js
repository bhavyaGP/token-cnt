const express = require('express');
const router = require('../router');
const inventoryController = require('../controllers/inventory.controller');
const authMiddleware = require('../middleware/authMiddleware');

jest.mock('../controllers/inventory.controller');
jest.mock('../middleware/authMiddleware');

describe('inventory router', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    authMiddleware.mockImplementation((req,res,next) => next());
  });

  describe('GET /', () => {
    it('should get player inventory', () => {
      router.get('/', authMiddleware, inventoryController.getPlayerInventory);
      router('/', req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(inventoryController.getPlayerInventory).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle errors', () => {
      const error = new Error('Failed to get inventory');
      inventoryController.getPlayerInventory.mockImplementation((req, res, next) => next(error));
      router.get('/', authMiddleware, inventoryController.getPlayerInventory);
      router('/', req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /buy', () => {
    it('should buy an item', () => {
      router.post('/buy', authMiddleware, inventoryController.buyItem);
      router.post('/buy', req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(inventoryController.buyItem).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle errors', () => {
      const error = new Error('Failed to buy item');
      inventoryController.buyItem.mockImplementation((req, res, next) => next(error));
      router.post('/buy', authMiddleware, inventoryController.buyItem);
      router.post('/buy', req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /sell', () => {
    it('should sell an item', () => {
      router.post('/sell', authMiddleware, inventoryController.sellItem);
      router.post('/sell', req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(inventoryController.sellItem).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle errors', () => {
      const error = new Error('Failed to sell item');
      inventoryController.sellItem.mockImplementation((req, res, next) => next(error));
      router.post('/sell', authMiddleware, inventoryController.sellItem);
      router.post('/sell', req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  it('should export the router', () => {
    expect(typeof router).toBe('object');
    expect(router.stack).toBeDefined();
  });


  it('should handle auth middleware errors', () => {
    const authError = new Error('Authentication failed');
    authMiddleware.mockImplementation((req, res, next) => next(authError));
    router.get('/', authMiddleware, inventoryController.getPlayerInventory);
    router('/', req, res, next);
    expect(next).toHaveBeenCalledWith(authError);
  });

});

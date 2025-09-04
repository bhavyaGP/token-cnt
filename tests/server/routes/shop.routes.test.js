const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, shopController.listItems);
router.post('/buy', authMiddleware, shopController.buyItem);

module.exports = router;

jest.mock('../controllers/shop.controller');
jest.mock('../middleware/authMiddleware');

describe('Shop Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should call authMiddleware and shopController.listItems', () => {
      const req = {};
      const res = {};
      router.handle(req, res);
      expect(authMiddleware).toHaveBeenCalledWith(expect.any(Function));
      expect(shopController.listItems).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });
  });

  describe('POST /buy', () => {
    test('should call authMiddleware and shopController.buyItem', () => {
      const req = {};
      const res = {};
      router.handle(req, res, ()=>{});
      expect(authMiddleware).toHaveBeenCalledWith(expect.any(Function));
      expect(shopController.buyItem).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });
  });

  test('should export the router', () => {
    expect(typeof router).toBe('object');
    expect(router.get).toBeDefined();
    expect(router.post).toBeDefined();
  });

  describe('Error Handling', () => {
    test('should handle errors in authMiddleware', () => {
        const req = {};
        const res = { status: jest.fn(), json: jest.fn() };
        const next = jest.fn();
        authMiddleware.mockImplementation((req, res, next) => {
          next(new Error('Auth failed'));
        });
        router.handle(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });
      test('should handle errors in shopController.listItems', () => {
        const req = {};
        const res = { status: jest.fn(), json: jest.fn() };
        const next = jest.fn();
        shopController.listItems.mockImplementation((req, res, next) => {
          next(new Error('Failed to list items'));
        });
        router.handle(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });
      test('should handle errors in shopController.buyItem', () => {
        const req = {};
        const res = { status: jest.fn(), json: jest.fn() };
        const next = jest.fn();
        shopController.buyItem.mockImplementation((req, res, next) => {
          next(new Error('Failed to buy item'));
        });
        router.handle(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });
  });
});

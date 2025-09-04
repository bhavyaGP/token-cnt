const express = require('express');
const router = require('../router');
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

jest.mock('../controllers/shop.controller');
jest.mock('../middleware/authMiddleware');

describe('Shop Router', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });


  test('GET / calls shopController.getStoreItems with authMiddleware', () => {
    router.handle({ url: '/', method: 'GET' }, req, res, next);
    expect(authMiddleware).toHaveBeenCalled();
    expect(shopController.getStoreItems).toHaveBeenCalled();
  });

  test('GET / handles errors from shopController.getStoreItems', () => {
    const error = new Error('Failed to get store items');
    shopController.getStoreItems.mockImplementation((req,res,next) => next(error));
    router.handle({ url: '/', method: 'GET' }, req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('GET / with invalid method calls next', () => {
    router.handle({ url: '/', method: 'POST' }, req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(authMiddleware).not.toHaveBeenCalled();
    expect(shopController.getStoreItems).not.toHaveBeenCalled();
  });

  test('GET / handles errors from authMiddleware', () => {
    const error = new Error('Authentication failed');
    authMiddleware.mockImplementation((req, res, next) => next(error));
    router.handle({ url: '/', method: 'GET' }, req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(shopController.getStoreItems).not.toHaveBeenCalled();
  })

  test('Handles requests to other paths', () => {
    router.handle({ url: '/other', method: 'GET' }, req, res, next);
    expect(next).toHaveBeenCalled();
    expect(authMiddleware).not.toHaveBeenCalled();
    expect(shopController.getStoreItems).not.toHaveBeenCalled();
  });

});

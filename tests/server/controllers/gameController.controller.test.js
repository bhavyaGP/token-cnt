const { getLeaderboard, getPlayerStats, handleGameEvent, bulkProcessEvents, _internal } = require('../gameController.controller');
const User = require('../models/user.model');
const Submission = require('../models/Submission.model');
const Level = require('../models/Level.model');
const Inventory = require('../models/Inventory.model');
const StoreItem = require('../models/StoreItem.model');
const { computeXPForLevel, weightedRandomChoice, processGameEvent: processGameEventInternal, ensureInventoryForUser } = _internal;

jest.mock('../models/user.model');
jest.mock('../models/Submission.model');
jest.mock('../models/Level.model');
jest.mock('../models/Inventory.model');
jest.mock('../models/StoreItem.model');

describe('gameController', () => {
  describe('getLeaderboard', () => {
    it('should fetch and return leaderboard data', async () => {
      User.find.mockResolvedValue([{ username: 'user1', coins: 100, level: 1, xp: 10 }, { username: 'user2', coins: 50, level: 2, xp: 20 }]);
      const req = {};
      const res = { json: jest.fn() };
      await getLeaderboard(req, res);
      expect(res.json).toHaveBeenCalledWith([{ username: 'user1', coins: 100, level: 1, xp: 10 }, { username: 'user2', coins: 50, level: 2, xp: 20 }]);
    });
    it('should handle errors gracefully', async () => {
      User.find.mockRejectedValue(new Error('Failed to fetch leaderboard'));
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getLeaderboard(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch leaderboard' });
    });
  });
  describe('getPlayerStats', () => {
    it('should fetch and return player stats', async () => {
      const req = { user: { _id: '123' } };
      User.findById.mockResolvedValue({ _id: '123', username: 'user1' });
      Submission.find.mockResolvedValue([{ userId: '123' }]);
      const res = { json: jest.fn() };
      await getPlayerStats(req, res);
      expect(res.json).toHaveBeenCalledWith({ user: { _id: '123', username: 'user1' }, submissions: [{ userId: '123' }] });
    });
    it('should handle errors gracefully', async () => {
      const req = { user: { _id: '123' } };
      User.findById.mockRejectedValue(new Error('Failed to fetch player stats'));
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getPlayerStats(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch player stats' });
    });
  });
  describe('handleGameEvent', () => {
    it('should handle a valid game event', async () => {
      const req = { user: { _id: '123' }, body: { event: { type: 'complete_level', payload: { levelId: 1 } } } };
      User.findById.mockResolvedValue({ _id: '123', level: 1, coins: 0, xp: 0 });
      Level.findOne.mockResolvedValue({ coinsRewarded: 100, expectedTime: 60 });
      const res = { json: jest.fn() };
      await handleGameEvent(req, res);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', messages: expect.arrayContaining(['Level 1 cleared. Coins awarded: 120']) });
    });
    it('should handle invalid events', async () => {
      const req = { user: { _id: '123' }, body: { event: { type: 'invalid' } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handleGameEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid event' });
    });
    it('should handle errors gracefully', async () => {
      const req = { user: { _id: '123' }, body: { event: { type: 'complete_level', payload: { levelId: 1 } } } };
      User.findById.mockRejectedValue(new Error('Failed to handle game event'));
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handleGameEvent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to handle game event' });
    });
  });
  describe('bulkProcessEvents', () => {
    it('should process events for multiple users', async () => {
      const req = { body: { userIds: ['1', '2'], event: { type: 'daily_login' } } };
      User.findById.mockResolvedValue({ _id: '1', coins: 0, loginStreak: { last: null, count: 0 } });
      const res = { json: jest.fn() };
      await bulkProcessEvents(req, res);
      expect(res.json).toHaveBeenCalled();
    });
    it('should handle invalid payload', async () => {
      const req = { body: { userIds: '1', event: { type: 'daily_login' } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await bulkProcessEvents(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload' });
    });
    it('should handle errors gracefully', async () => {
      const req = { body: { userIds: ['1', '2'], event: { type: 'daily_login' } } };
      User.findById.mockRejectedValue(new Error('Failed to handle game event'));
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await bulkProcessEvents(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bulk processing failed' });
    });
  });
  describe('_internal', () => {
    describe('computeXPForLevel', () => {
      it('should compute XP for a given level', () => {
        expect(computeXPForLevel(1)).toBe(60);
        expect(computeXPForLevel(10)).toBe(1212);
      });
    });
    describe('weightedRandomChoice', () => {
      it('should choose an item based on weights', () => {
        const choices = [{ weight: 70, item: 'A' }, { weight: 30, item: 'B' }];
        const result = weightedRandomChoice(choices);
        expect(choices.map(c => c.item)).toContain(result);
      });
      it('should handle empty choices', () => {
        expect(weightedRandomChoice([])).toBe(null);
      });
    });
    describe('processGameEventInternal', () => {
      it('should process complete_level event', async () => {
        const user = { _id: '123', level: 1, coins: 0, xp: 0 };
        const event = { type: 'complete_level', payload: { levelId: 1, timeTaken: 30 } };
        User.findById.mockResolvedValue(user);
        Level.findOne.mockResolvedValue({ coinsRewarded: 100, expectedTime: 60 });
        const result = await processGameEventInternal(user, event);
        expect(result.changed).toBe(true);
        expect(result.messages).toContain('Level 1 cleared');
      });
      it('should process purchase_attempt event', async () => {
        const user = { _id: '123', coins: 100 };
        const event = { type: 'purchase_attempt', payload: { itemId: '1' } };
        User.findById.mockResolvedValue(user);
        StoreItem.findOne.mockResolvedValue({ itemId: '1', cost: 50, name: 'item1' });
        const result = await processGameEventInternal(user, event);
        expect(result.changed).toBe(true);
        expect(result.messages).toContain('Purchased item1');
      });
      it('should process daily_login event', async () => {
        const user = { _id: '123', coins: 0, loginStreak: { last: null, count: 0 } };
        const event = { type: 'daily_login' };
        User.findById.mockResolvedValue(user);
        const result = await processGameEventInternal(user, event);
        expect(result.changed).toBe(true);
        expect(result.messages).toContain('Daily login');
      });
      it('should process special_event', async () => {
        const user = { _id: '123', xp: 600 };
        const event = { type: 'special_event', payload: { eventKey: 'spring_festival' } };
        User.findById.mockResolvedValue(user);
        const result = await processGameEventInternal(user, event);
        expect(result.changed).toBe(true);
        expect(result.messages).toContain('Festival reward');
      });
      it('should handle unknown event type', async () => {
        const user = { _id: '123' };
        const event = { type: 'unknown' };
        const result = await processGameEventInternal(user, event);
        expect(result.changed).toBe(false);
        expect(result.messages).toContain('Unhandled event type');
      });
    });
    describe('ensureInventoryForUser', () => {
      it('should create a new inventory if one does not exist', async () => {
        Inventory.findOne.mockResolvedValue(null);
        const inv = await ensureInventoryForUser('123');
        expect(inv.user).toBe('123');
        expect(inv.tools).toEqual([]);
      });
      it('should return existing inventory if found', async () => {
        const existingInv = { user: '123', tools: ['tool1'] };
        Inventory.findOne.mockResolvedValue(existingInv);
        const inv = await ensureInventoryForUser('123');
        expect(inv).toBe(existingInv);
      });
    });
  });
});

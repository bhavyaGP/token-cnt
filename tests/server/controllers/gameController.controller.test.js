const { getLeaderboard, getPlayerStats, handleGameEvent, bulkProcessEvents, _internal } = require('../src/game-logic');
const User = require('../models/user.model');
const Submission = require('../models/Submission.model');
const Level = require('../models/Level.model');
const Inventory = require('../models/Inventory.model');
const StoreItem = require('../models/StoreItem.model');
const { computeXPForLevel, weightedRandomChoice, processGameEvent: processGameEventInternal, ensureInventoryForUser, acquireUserLock, checkRateLimit, detectSuspiciousActivity } = _internal;

jest.mock('../models/user.model');
jest.mock('../models/Submission.model');
jest.mock('../models/Level.model');
jest.mock('../models/Inventory.model');
jest.mock('../models/StoreItem.model');

describe('clamp', () => {
  it('should clamp values correctly', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(15, 1, 10)).toBe(10);
  });
});

describe('weightedRandomChoice', () => {
  it('should choose items based on weights', () => {
    const choices = [{ weight: 80, item: 'A' }, { weight: 20, item: 'B' }];
    const results = [];
    for (let i = 0; i < 1000; i++) {
      results.push(weightedRandomChoice(choices));
    }
    expect(results.filter(r => r === 'A').length).toBeGreaterThan(results.filter(r => r === 'B').length);
  });
  it('should handle empty choices', () => {
    expect(weightedRandomChoice([])).toBeNull();
  });
});

describe('computeXPForLevel', () => {
  it('should compute XP correctly', () => {
    expect(computeXPForLevel(1)).toBe(68);
    expect(computeXPForLevel(10)).toBe(2235);
  });
});

describe('ensureInventoryForUser', () => {
  it('should create inventory if it does not exist', async () => {
    Inventory.findOne.mockResolvedValue(null);
    Inventory.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));
    const inv = await ensureInventoryForUser('test-user');
    expect(Inventory.findOne).toHaveBeenCalledWith({ user: 'test-user' });
    expect(inv.user).toBe('test-user');
    expect(inv.tools).toEqual([]);
    expect(inv.save).toHaveBeenCalled();
  });
  it('should return existing inventory if it exists', async () => {
    const existingInv = { user: 'test-user', tools: ['tool1'] };
    Inventory.findOne.mockResolvedValue(existingInv);
    const inv = await ensureInventoryForUser('test-user');
    expect(inv).toBe(existingInv);
    expect(Inventory.findOne).toHaveBeenCalledWith({ user: 'test-user' });
    expect(Inventory.mock.instances.length).toBe(0)
  });
});

describe('acquireUserLock', () => {
  it('should acquire and release locks', async () => {
    const release = acquireUserLock('test-user');
    expect(userLocks.size).toBe(1);
    await release();
    expect(userLocks.size).toBe(0);
  });
});

describe('checkRateLimit', () => {
  it('should check rate limits', () => {
    expect(checkRateLimit('test-user')).toEqual({ ok: true });
    const limitResult = checkRateLimit('test-user');
    expect(limitResult).toEqual({ ok: true });
    const secondResult = checkRateLimit('test-user');
    expect(secondResult.ok).toBe(true);
  });
});

describe('detectSuspiciousActivity', () => {
  it('should detect suspicious activity', () => {
    expect(detectSuspiciousActivity(null, {})).toBe(false);
    expect(detectSuspiciousActivity({ coins: 1000000 }, {})).toBe(true);
    expect(detectSuspiciousActivity({}, { type: 'complete_level', payload: { timeTaken: 0 } })).toBe(true);
  });
});

describe('transactionalUserUpdate', () => {
  it('should perform transactional updates', async () => {
    User.findById.mockResolvedValue({ _id: 'test-user', coins: 100, save: jest.fn().mockResolvedValue({}) });
    const updater = jest.fn().mockResolvedValue({ changed: true, messages: ['Updated'] });
    const result = await transactionalUserUpdate('test-user', updater);
    expect(updater).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith('test-user');
    expect(result).toEqual({ changed: true, messages: ['Updated'] });
  });
});


describe('processGameEvent', () => {
  it('should process complete_level event', async () => {
    const user = { _id: 'test-user', level: 1, coins: 0, xp: 0, loginStreak: { count: 0 }, achievements: [], save: jest.fn().mockResolvedValue({})};
    const event = { type: 'complete_level', payload: { levelId: 1, timeTaken: 30, hintsUsed: 0 } };
    Level.findOne.mockResolvedValue({ levelId: 1, coinsRewarded: 100, expectedTime: 60 });
    Submission.exists.mockResolvedValue(false);
    const result = await processGameEventInternal(user, event);
    expect(result.changed).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });
  it('should handle rate limiting', async () => {
    const user = { _id: 'test-user', level: 1, coins: 0, save: jest.fn().mockResolvedValue({}) };
    const event = { type: 'complete_level', payload: { levelId: 1, timeTaken: 30, hintsUsed: 0 } };
    checkRateLimit.mockReturnValue({ ok: false, retryAfter: 1000 });
    const result = await processGameEventInternal(user, event);
    expect(result.changed).toBe(false);
    expect(result.retryAfter).toBe(1000);
  });
});


describe('getLeaderboard', () => {
  it('should fetch leaderboard', async () => {
    User.find.mockResolvedValue([{ username: 'user1', coins: 100, level: 1, xp: 10 }]);
    const res = { json: jest.fn() };
    await getLeaderboard({}, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('getPlayerStats', () => {
  it('should fetch player stats', async () => {
    const req = { user: { _id: 'test-user' } };
    User.findById.mockResolvedValue({ username: 'test-user' });
    Submission.find.mockResolvedValue([]);
    const res = { json: jest.fn() };
    await getPlayerStats(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});


describe('handleGameEvent', () => {
  it('should handle game events', async () => {
    const req = { user: { _id: 'test-user' }, body: { event: { type: 'complete_level', payload: { levelId: 1, timeTaken: 30, hintsUsed: 0 } } } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    processGameEventInternal.mockResolvedValue({ changed: true, messages: ['Event processed'] });
    await handleGameEvent(req, res);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok', messages: ['Event processed'] });
  });
});

describe('bulkProcessEvents', () => {
  it('should bulk process events', async () => {
    const req = { body: { userIds: ['test-user1', 'test-user2'], event: { type: 'daily_login' } } };
    const res = { json: jest.fn() };
    User.findById.mockResolvedValue({ _id: 'test-user1', save: jest.fn().mockResolvedValue({}) });
    processGameEventInternal.mockResolvedValue({ changed: true, messages: ['Event processed'] });
    await bulkProcessEvents(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

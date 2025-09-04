jest.mock('mongoose', () => ({}));

const { makeAdvancedEventHandler, synthesizeEventOutcome, determineRewardMultiplier, clampNumber } = require('./advancedEvents.controller');

describe('clampNumber', () => {
  it('should clamp a number to the minimum value', () => {
    expect(clampNumber(1, 5, 10)).toBe(5);
  });
  it('should clamp a number to the maximum value', () => {
    expect(clampNumber(15, 5, 10)).toBe(10);
  });
  it('should return the number if within range', () => {
    expect(clampNumber(7, 5, 10)).toBe(7);
  });
});

describe('determineRewardMultiplier', () => {
  it('should return a base multiplier of 1 for easy difficulty', () => {
    expect(determineRewardMultiplier({ difficulty: 'easy' })).toBe(1);
  });
  it('should return a multiplier of 1.5 for hard difficulty', () => {
    expect(determineRewardMultiplier({ difficulty: 'hard' })).toBe(1.5);
  });
  it('should apply streak multipliers correctly', () => {
    expect(determineRewardMultiplier({ difficulty: 'easy', streak: { count: 5 } })).toBeCloseTo(1.1);
    expect(determineRewardMultiplier({ difficulty: 'easy', streak: { count: 10 } })).toBeCloseTo(1.3);
    expect(determineRewardMultiplier({ difficulty: 'easy', streak: { count: 30 } })).toBeCloseTo(2);
  });
  it('should apply bonus multipliers correctly', () => {
    expect(determineRewardMultiplier({ difficulty: 'easy', bonusActive: true })).toBeCloseTo(1.25);
  });
  it('should apply user flag multipliers correctly', () => {
    expect(determineRewardMultiplier({ difficulty: 'easy', userFlags: ['vip'] })).toBeCloseTo(1.5);
    expect(determineRewardMultiplier({ difficulty: 'easy', userFlags: ['vip', 'early_supporter'] })).toBeCloseTo(1.8);
    expect(determineRewardMultiplier({ difficulty: 'easy', userFlags: ['beta_tester'] })).toBeCloseTo(1.15);
  });
  it('should clamp the multiplier between 0.5 and 5', () => {
    expect(determineRewardMultiplier({ difficulty: 'hard', streak: { count: 30 }, bonusActive: true, userFlags: ['vip', 'early_supporter'] })).toBe(5);
    expect(determineRewardMultiplier({ difficulty: 'easy', streak: {count: 0}, bonusActive: false, userFlags: [] })).toBe(1);
  });
});


describe('synthesizeEventOutcome', () => {
  it('should handle missing user or payload', async () => {
    expect((await synthesizeEventOutcome({})).success).toBe(false);
    expect((await synthesizeEventOutcome({ user: {} })).success).toBe(false);
  });
  it('should compute reward correctly with various inputs', async () => {
    const user = { _id: 'testuser', loginStreak: { count: 5 }, activeBonus: true, flags: ['vip'], coins: 100, xp: 1000, level: 5 };
    const payload = { difficulty: 'hard', timeTaken: 25, hintsUsed: 1 };
    const outcome = await synthesizeEventOutcome({ user, eventPayload: payload });
    expect(outcome.success).toBe(true);
    expect(outcome.changes.reward).toBeGreaterThan(0);
  });
  it('should apply rule engine overrides', async () => {
    const user = { _id: 'testuser', loginStreak: { count: 15 }, flags: ['double_weekend'], coins: 100, xp: 1000, level: 5 };
    const payload = { difficulty: 'hard', timeTaken: 25, hintsUsed: 1 };
    const outcome = await synthesizeEventOutcome({ user, eventPayload: payload });
    expect(outcome.msgs).toContain('Rule override applied: weekend double');
  });
  it('should handle cache correctly', async () => {
    const user = { _id: 'testuser', loginStreak: { count: 5 }, activeBonus: true, flags: ['vip'], coins: 100, xp: 1000, level: 5 };
    const payload = { difficulty: 'hard', timeTaken: 25, hintsUsed: 1 };
    const outcome1 = await synthesizeEventOutcome({ user, eventPayload: payload });
    const outcome2 = await synthesizeEventOutcome({ user, eventPayload: payload });
    expect(outcome1).toEqual(outcome2);
  });
});


describe('makeAdvancedEventHandler', () => {
  const mockModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockReq = { user: { _id: 'testuser' }, body: { payload: { difficulty: 'easy' } } };
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    mockModel.findById.mockReset();
    mockModel.findOne.mockReset();
    mockModel.create.mockReset();
    mockModel.save.mockReset();
    mockRes.status.mockReset();
    mockRes.json.mockReset();
  });

  it('should handle successful event processing', async () => {
    mockModel.findById.mockResolvedValue({ _id: 'testuser', coins: 100, save: jest.fn().mockResolvedValue(true) });
    mockModel.findOne.mockResolvedValue(null);
    mockModel.create.mockResolvedValue(true);
    const handler = makeAdvancedEventHandler({ UserModel: mockModel, SubmissionModel: mockModel, InventoryModel: mockModel });
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockModel.findById).toHaveBeenCalledWith('testuser');
    expect(mockModel.save).toHaveBeenCalled();
  });
  it('should handle user not found', async () => {
    mockModel.findById.mockResolvedValue(null);
    const handler = makeAdvancedEventHandler({ UserModel: mockModel, SubmissionModel: mockModel, InventoryModel: mockModel });
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
  it('should handle database errors gracefully', async () => {
    mockModel.findById.mockResolvedValue({ _id: 'testuser', coins: 100, save: jest.fn().mockRejectedValue(new Error('DB error')) });
    const handler = makeAdvancedEventHandler({ UserModel: mockModel, SubmissionModel: mockModel, InventoryModel: mockModel });
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

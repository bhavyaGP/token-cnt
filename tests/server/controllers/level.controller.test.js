const Level = require("../models/Level.model");
const Submission = require("../models/Submission.model");
const User = require("../models/user.model");
const controller = require("../controllers/levelController");

jest.mock("../models/Level.model");
jest.mock("../models/Submission.model");
jest.mock("../models/user.model");

describe("getAvailableLevels", () => {
  it("should return levels less than or equal to user.currentLevel", async () => {
    const mockUser = { currentLevel: 3 };
    const mockLevels = [{ number: 1 }, { number: 2 }, { number: 3 }];
    Level.find.mockResolvedValue(mockLevels);
    const req = { user: mockUser };
    const res = { json: jest.fn() };
    await controller.getAvailableLevels(req, res);
    expect(Level.find).toHaveBeenCalledWith({ number: { $lte: 3 } });
    expect(res.json).toHaveBeenCalledWith(mockLevels);
  });
});

describe("getLevelDetails", () => {
  it("should return level details for a given levelNumber", async () => {
    const mockLevel = { number: 1 };
    Level.findOne.mockResolvedValue(mockLevel);
    const req = { params: { levelNumber: 1 } };
    const res = { json: jest.fn() };
    await controller.getLevelDetails(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ number: 1 });
    expect(res.json).toHaveBeenCalledWith(mockLevel);
  });
  it("should handle level not found", async () => {
    Level.findOne.mockResolvedValue(null);
    const req = { params: { levelNumber: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controller.getLevelDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getUnlockedLevels", () => {
  it("should return unlocked levels", async () => {
    const mockUser = { level: 3 };
    const mockLevels = [{ levelId: 1 }, { levelId: 2 }, { levelId: 3 }];
    Level.find.mockResolvedValue(mockLevels);
    const req = { user: mockUser };
    const res = { json: jest.fn() };
    await controller.getUnlockedLevels(req, res);
    expect(Level.find).toHaveBeenCalledWith({ levelId: { $lte: 3 } });
    expect(res.json).toHaveBeenCalledWith(mockLevels);
  });
  it("should handle errors", async () => {
    const mockError = new Error("Failed to fetch unlocked levels");
    Level.find.mockRejectedValue(mockError);
    const req = { user: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.getUnlockedLevels(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch unlocked levels' });
  });
});

describe("getLevelById", () => {
  it("should return level details for a given levelId", async () => {
    const mockLevel = { levelId: 1 };
    Level.findOne.mockResolvedValue(mockLevel);
    const req = { params: { levelId: 1 } };
    const res = { json: jest.fn() };
    await controller.getLevelById(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ levelId: 1 });
    expect(res.json).toHaveBeenCalledWith(mockLevel);
  });
  it("should handle level not found", async () => {
    Level.findOne.mockResolvedValue(null);
    const req = { params: { levelId: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controller.getLevelById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("should handle errors", async () => {
    const mockError = new Error("Failed to fetch level");
    Level.findOne.mockRejectedValue(mockError);
    const req = { params: { levelId: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.getLevelById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch level' });
  });
});

describe("submitLevelAnswer", () => {
  it("should submit correct answer and update user level", async () => {
    const mockLevel = { levelId: 1, correctAnswer: "test", coinsRewarded: 10 };
    const mockUser = { _id: 1, level: 1, coins: 0 };
    Level.findOne.mockResolvedValue(mockLevel);
    Submission.create.mockResolvedValue({});
    User.save.mockResolvedValue({ level:2, coins: 10 });
    const req = { params: { levelId: 1 }, body: { answer: "test" }, user: mockUser };
    const res = { json: jest.fn() };
    await controller.submitLevelAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: true, message: 'Correct! Next level unlocked.' });
  });
  it("should submit incorrect answer", async () => {
    const mockLevel = { levelId: 1, correctAnswer: "test" };
    const mockUser = { _id: 1, level: 1, coins: 0 };
    Level.findOne.mockResolvedValue(mockLevel);
    Submission.create.mockResolvedValue({});
    const req = { params: { levelId: 1 }, body: { answer: "wrong" }, user: mockUser };
    const res = { json: jest.fn() };
    await controller.submitLevelAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: false, message: 'Incorrect. Try again or ask Raju for help.' });
  });
  it("should handle level not found", async () => {
    Level.findOne.mockResolvedValue(null);
    const req = { params: { levelId: 1 }, body: { answer: "test" }, user: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controller.submitLevelAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("should handle errors", async () => {
    const mockError = new Error("Failed to submit answer");
    Submission.create.mockRejectedValue(mockError);
    const req = { params: { levelId: 1 }, body: { answer: "test" }, user: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.submitLevelAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to submit answer' });
  });
});

describe("unlockNextLevel", () => {
  it("should unlock next level", async () => {
    const mockUser = { _id: 1, level: 1 };
    User.save.mockResolvedValue({ level: 2 });
    const req = { params: { levelId: 1 }, user: mockUser };
    const res = { json: jest.fn() };
    await controller.unlockNextLevel(req, res);
    expect(User.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Next level unlocked', newLevel: 2 });
  });
  it("should handle cannot unlock level", async () => {
    const mockUser = { _id: 1, level: 2 };
    const req = { params: { levelId: 1 }, user: mockUser };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.unlockNextLevel(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot unlock this level yet.' });
  });
  it("should handle errors", async () => {
    const mockUser = { _id: 1, level: 1 };
    User.save.mockRejectedValue(new Error("Failed to unlock next level"));
    const req = { params: { levelId: 1 }, user: mockUser };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.unlockNextLevel(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to unlock next level' });
  });
});

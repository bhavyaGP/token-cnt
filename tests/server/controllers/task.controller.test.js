const Task = require("../models/task.model");
const { getLevelTasks, submitAnswer } = require("../controllers/task.controller");

jest.mock("../models/task.model");

describe("getLevelTasks", () => {
  let req, res;
  beforeEach(() => {
    req = { params: {} };
    res = { json: jest.fn(), status: jest.fn(() => res) };
  });

  it("should return tasks for a given level", async () => {
    req.params.level = 1;
    Task.find.mockResolvedValue([{ level: 1 }]);
    await getLevelTasks(req, res);
    expect(res.json).toHaveBeenCalledWith([{ level: 1 }]);
  });

  it("should handle errors gracefully", async () => {
    req.params.level = 1;
    Task.find.mockRejectedValue(new Error("Failed to fetch tasks"));
    await getLevelTasks(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch tasks' });
  });

  it("should handle missing level parameter", async () => {
    await getLevelTasks(req, res);
    expect(Task.find).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

});

describe("submitAnswer", () => {
  let req, res;
  beforeEach(() => {
    req = { body: {} };
    res = { json: jest.fn(), status: jest.fn(() => res) };
  });

  it("should submit a correct answer", async () => {
    req.body = { level: 1, taskId: "1", userAnswer: "correct" };
    Task.findById.mockResolvedValue({ correctAnswer: "correct" });
    await submitAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: true, message: "Sahi jawab bhai!" });
  });

  it("should submit an incorrect answer", async () => {
    req.body = { level: 1, taskId: "1", userAnswer: "incorrect" };
    Task.findById.mockResolvedValue({ correctAnswer: "correct" });
    await submitAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: false, message: "Galat hai! Raju se puchh lo?" });
  });

  it("should handle task not found", async () => {
    req.body = { level: 1, taskId: "1", userAnswer: "incorrect" };
    Task.findById.mockResolvedValue(null);
    await submitAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
  });

  it("should handle errors gracefully", async () => {
    req.body = { level: 1, taskId: "1", userAnswer: "incorrect" };
    Task.findById.mockRejectedValue(new Error("Failed to submit answer"));
    await submitAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to submit answer' });
  });

  it("should handle missing parameters", async () => {
    await submitAnswer(req, res);
    expect(Task.findById).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

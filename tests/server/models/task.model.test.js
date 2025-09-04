const mongoose = require('mongoose');
const Task = require('./your-file-name'); // Replace your-file-name


describe('Task Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Task.deleteMany({});
  });


  it('should create a new task', async () => {
    const task = new Task({ taskId: 'T1', level: 1, problem: 'Problem 1', correctAnswer: 'Answer 1', reward: 10 });
    await task.save();
    expect(task._id).toBeDefined();
  });

  it('should fail to create a task without taskId', async () => {
    await expect(Task.create({})).rejects.toThrow();
  });


  it('should fail to create a task without level', async () => {
    await expect(Task.create({ taskId: 'T1', problem: 'Problem 1', correctAnswer: 'Answer 1', reward: 10 })).rejects.toThrow();
  });

  it('should fail to create a task without problem', async () => {
    await expect(Task.create({ taskId: 'T1', level: 1, correctAnswer: 'Answer 1', reward: 10 })).rejects.toThrow();
  });

  it('should fail to create a task without correctAnswer', async () => {
    await expect(Task.create({ taskId: 'T1', level: 1, problem: 'Problem 1', reward: 10 })).rejects.toThrow();
  });

  it('should create a task with optional fields', async () => {
    const task = new Task({ taskId: 'T2', level: 2, problem: 'Problem 2', correctAnswer: 'Answer 2', hint: 'Hint 2', toolsRequired: ['tool1'], reward: 20, solution: 'Solution 2' });
    await task.save();
    expect(task._id).toBeDefined();
  });


  it('should find a task by taskId', async () => {
    const task = await Task.create({ taskId: 'T3', level: 3, problem: 'Problem 3', correctAnswer: 'Answer 3', reward: 30 });
    const foundTask = await Task.findOne({ taskId: 'T3' });
    expect(foundTask.taskId).toBe('T3');
  });

  it('should fail to create a task with duplicate taskId', async () => {
    await Task.create({ taskId: 'T4', level: 4, problem: 'Problem 4', correctAnswer: 'Answer 4', reward: 40 });
    await expect(Task.create({ taskId: 'T4', level: 5, problem: 'Problem 5', correctAnswer: 'Answer 5', reward: 50 })).rejects.toThrow();
  });

  it('should update a task', async () => {
    const task = await Task.create({ taskId: 'T5', level: 5, problem: 'Problem 5', correctAnswer: 'Answer 5', reward: 50 });
    task.problem = 'Updated Problem';
    await task.save();
    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.problem).toBe('Updated Problem');
  });

  it('should delete a task', async () => {
    const task = await Task.create({ taskId: 'T6', level: 6, problem: 'Problem 6', correctAnswer: 'Answer 6', reward: 60 });
    await Task.findByIdAndDelete(task._id);
    const deletedTask = await Task.findById(task._id);
    expect(deletedTask).toBeNull();
  });
});

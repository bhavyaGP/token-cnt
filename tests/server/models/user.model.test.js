const mongoose = require('mongoose');
const User = require('./path/to/your/userSchema'); // Replace with the actual path

describe('User Schema', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new user', async () => {
    const user = new User({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    await user.save();
    expect(user._id).toBeDefined();
  });

  it('should fail to create a user with duplicate email', async () => {
    const user1 = new User({ username: 'testuser1', email: 'duplicate@example.com', password: 'password123' });
    await user1.save();
    const user2 = new User({ username: 'testuser2', email: 'duplicate@example.com', password: 'password456' });
    await expect(user2.save()).rejects.toThrow();
  });

  it('should create a user with default values', async () => {
    const user = new User({ username: 'defaultuser', email: 'default@example.com', password: 'password789' });
    await user.save();
    expect(user.level).toBe(1);
    expect(user.coins).toBe(0);
    expect(user.toolsUnlocked).toEqual([]);
    expect(user.inventory).toEqual([]);
    expect(user.tasksCompleted).toEqual([]);
    expect(user.achievements).toEqual([]);
  });


  it('should update user details', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    user.level = 5;
    user.coins = 100;
    user.toolsUnlocked = ['multimeter', 'oscilloscope'];
    user.inventory = [{ item: 'resistor', qty: 10 }];
    user.tasksCompleted = ['task1', 'task2'];
    user.achievements = ['achievement1'];
    await user.save();
    expect(user.level).toBe(5);
    expect(user.coins).toBe(100);
    expect(user.toolsUnlocked).toEqual(['multimeter', 'oscilloscope']);
    expect(user.inventory).toEqual([{ item: 'resistor', qty: 10 }]);
    expect(user.tasksCompleted).toEqual(['task1', 'task2']);
    expect(user.achievements).toEqual(['achievement1']);

  });

  it('should handle missing required fields', async () => {
    await expect(new User({ email: 'missing@example.com' }).save()).rejects.toThrow();
    await expect(new User({ username: 'missingUsername', password: 'missingPassword'}).save()).rejects.toThrow();

  });

  it('should find a user by email', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });

  it('should return null if user not found', async () => {
    const user = await User.findOne({ email: 'nonexistent@example.com' });
    expect(user).toBeNull();
  });

  it('should delete a user', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    await user.deleteOne();
    const deletedUser = await User.findOne({ email: 'test@example.com' });
    expect(deletedUser).toBeNull();
  });
});

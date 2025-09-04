const mongoose = require('mongoose');
const Achievement = require('./achievementModel'); // Assuming the code is in achievementModel.js

describe('Achievement Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Achievement.deleteMany({});
  });


  it('should create a new achievement', async () => {
    const achievement = new Achievement({ name: 'Test Achievement', description: 'Test description', criteria: 'Test criteria', rewardCoins: 10 });
    await achievement.save();
    expect(achievement._id).toBeDefined();
  });

  it('should throw an error if name is missing', async () => {
    const achievement = new Achievement({ description: 'Test description', criteria: 'Test criteria', rewardCoins: 10 });
    await expect(achievement.save()).rejects.toThrow();
  });

  it('should create an achievement without description', async () => {
    const achievement = new Achievement({ name: 'Test Achievement', criteria: 'Test criteria', rewardCoins: 10 });
    await achievement.save();
    expect(achievement._id).toBeDefined();
  });

  it('should create an achievement without criteria', async () => {
    const achievement = new Achievement({ name: 'Test Achievement', description: 'Test description', rewardCoins: 10 });
    await achievement.save();
    expect(achievement._id).toBeDefined();
  });

  it('should create an achievement without rewardCoins', async () => {
    const achievement = new Achievement({ name: 'Test Achievement', description: 'Test description', criteria: 'Test criteria' });
    await achievement.save();
    expect(achievement._id).toBeDefined();
  });

  it('should find an achievement by name', async () => {
    const achievement = new Achievement({ name: 'Find Me', description: 'Test description', criteria: 'Test criteria', rewardCoins: 10 });
    await achievement.save();
    const foundAchievement = await Achievement.findOne({ name: 'Find Me' });
    expect(foundAchievement.name).toBe('Find Me');
  });


  it('should handle finding a non-existent achievement', async () => {
    const foundAchievement = await Achievement.findOne({ name: 'NonExistent' });
    expect(foundAchievement).toBeNull();
  });

  it('should update an achievement', async () => {
    const achievement = new Achievement({ name: 'Update Me', description: 'Test description', criteria: 'Test criteria', rewardCoins: 10 });
    await achievement.save();
    achievement.description = 'Updated description';
    await achievement.save();
    const updatedAchievement = await Achievement.findById(achievement._id);
    expect(updatedAchievement.description).toBe('Updated description');
  });


  it('should delete an achievement', async () => {
    const achievement = new Achievement({ name: 'Delete Me', description: 'Test description', criteria: 'Test criteria', rewardCoins: 10 });
    await achievement.save();
    await Achievement.findByIdAndDelete(achievement._id);
    const deletedAchievement = await Achievement.findById(achievement._id);
    expect(deletedAchievement).toBeNull();
  });

});

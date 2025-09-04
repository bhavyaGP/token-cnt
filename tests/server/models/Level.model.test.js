const mongoose = require('mongoose');
const Level = require('./levelModel'); 

describe('Level Schema', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new level', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      question: 'What is 1 + 1?',
      correctAnswer: '2',
      hints: ['Try adding the numbers'],
      explanation: '1 + 1 = 2'
    });
    await level.save();
    expect(level._id).toBeDefined();
  });

  it('should not create a level without levelId', async () => {
    const level = new Level({
      title: 'Level 1',
      question: 'What is 1 + 1?',
      correctAnswer: '2',
      hints: ['Try adding the numbers'],
      explanation: '1 + 1 = 2'
    });
    await expect(level.save()).rejects.toThrow();
  });


  it('should not create a level without title', async () => {
    const level = new Level({
      levelId: 1,
      question: 'What is 1 + 1?',
      correctAnswer: '2',
      hints: ['Try adding the numbers'],
      explanation: '1 + 1 = 2'
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should not create a level without question', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      correctAnswer: '2',
      hints: ['Try adding the numbers'],
      explanation: '1 + 1 = 2'
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should not create a level without correctAnswer', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      question: 'What is 1 + 1?',
      hints: ['Try adding the numbers'],
      explanation: '1 + 1 = 2'
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should create a level with unique levelId', async () => {
    const level1 = new Level({ levelId: 2, title: 'Level 2', question: 'What is 2 + 2?', correctAnswer: '4' });
    await level1.save();
    const level2 = new Level({ levelId: 2, title: 'Level 2 Duplicate', question: 'What is 2 + 2?', correctAnswer: '4' });
    await expect(level2.save()).rejects.toThrow();
  });

  it('should find a level by ID', async () => {
    const level = new Level({ levelId: 3, title: 'Level 3', question: 'What is 3 + 3?', correctAnswer: '6' });
    await level.save();
    const foundLevel = await Level.findOne({ levelId: 3 });
    expect(foundLevel.title).toBe('Level 3');
  });

  it('should handle finding a non-existent level', async () => {
    const foundLevel = await Level.findOne({ levelId: 999 });
    expect(foundLevel).toBeNull();
  });

});

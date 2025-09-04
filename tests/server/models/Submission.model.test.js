const mongoose = require('mongoose');
const Submission = require('./submissionModel'); // Assuming the model is saved as submissionModel.js

describe('Submission Model', () => {
  beforeAll(() => {
    return mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(() => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await Submission.deleteMany({});
  });

  it('should create a new submission', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    const savedSubmission = await submission.save();
    expect(savedSubmission._id).toBeDefined();
    expect(savedSubmission.userId).toBeDefined();
    expect(savedSubmission.levelId).toBe(1);
    expect(savedSubmission.submittedAnswer).toBe('test');
    expect(savedSubmission.isCorrect).toBe(true);
  });

  it('should throw an error if userId is not provided', async () => {
    const submission = new Submission({
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    await expect(submission.save()).rejects.toThrow();
  });

  it('should throw an error if levelId is not provided', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      submittedAnswer: 'test',
      isCorrect: true,
    });
    await expect(submission.save()).rejects.toThrow();
  });

  it('should throw an error if submittedAnswer is not provided', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      isCorrect: true,
    });
    await expect(submission.save()).rejects.toThrow();
  });

  it('should throw an error if isCorrect is not provided', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
    });
    await expect(submission.save()).rejects.toThrow();
  });

  it('should find a submission by ID', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    const savedSubmission = await submission.save();
    const foundSubmission = await Submission.findById(savedSubmission._id);
    expect(foundSubmission._id.toString()).toBe(savedSubmission._id.toString());
  });


  it('should find submissions by userId', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Submission.create([{ userId, levelId: 1, submittedAnswer: 'test1', isCorrect: true }, { userId, levelId: 2, submittedAnswer: 'test2', isCorrect: false }]);
    const submissions = await Submission.find({ userId });
    expect(submissions.length).toBe(2);
  });

  it('should handle invalid ObjectId', async () => {
    await expect(Submission.findById('invalidObjectId')).rejects.toThrow();
  });

});

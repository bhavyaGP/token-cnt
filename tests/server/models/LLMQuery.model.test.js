const mongoose = require('mongoose');
const LLMQuery = require('./llm-query-model'); // Assuming the model is in llm-query-model.js

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('LLMQuery Model', () => {
  it('should create a new LLMQuery document', async () => {
    const query = new LLMQuery({
      userId: new mongoose.Types.ObjectId(),
      type: 'hint',
      query: 'test query',
    });
    await query.save();
    expect(query._id).toBeDefined();
  });

  it('should require userId', async () => {
    expect(() => new LLMQuery({ type: 'hint', query: 'test query' })).toThrow();
  });

  it('should require type', async () => {
    expect(() => new LLMQuery({ userId: new mongoose.Types.ObjectId(), query: 'test query' })).toThrow();
  });

  it('should require query', async () => {
    expect(() => new LLMQuery({ userId: new mongoose.Types.ObjectId(), type: 'hint' })).toThrow();
  });


  it('should create a new LLMQuery document with all fields', async () => {
    const query = new LLMQuery({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      type: 'explanation',
      query: 'another test query',
      response: 'test response',
    });
    await query.save();
    expect(query._id).toBeDefined();
    expect(query.levelId).toBe(1);
    expect(query.response).toBe('test response');
  });

  it('should handle empty response', async () => {
    const query = new LLMQuery({
      userId: new mongoose.Types.ObjectId(),
      type: 'ask',
      query: 'yet another query',
    });
    await query.save();
    expect(query.response).toBeUndefined();
  });

  it('should set createdAt on creation', async () => {
    const query = new LLMQuery({
      userId: new mongoose.Types.ObjectId(),
      type: 'ask',
      query: 'createdAt test',
    });
    await query.save();
    expect(query.createdAt).toBeDefined();
  });

  it('should find a LLMQuery document', async () => {
    const query = await LLMQuery.findOne({ query: 'another test query' });
    expect(query).toBeDefined();
  });


  it('should not find a non-existent LLMQuery document', async () => {
      const query = await LLMQuery.findOne({ query: 'nonexistent' });
      expect(query).toBeNull();
  });

  it('should handle invalid ObjectId for userId', async () => {
    await expect(LLMQuery.create({ userId: 'invalid', type: 'hint', query: 'test' })).rejects.toThrow();
  });

  it('should update an existing LLMQuery document', async () => {
    const query = await LLMQuery.findOne({ query: 'another test query' });
    query.response = 'updated response';
    await query.save();
    const updatedQuery = await LLMQuery.findById(query._id);
    expect(updatedQuery.response).toBe('updated response');
  });

  it('should delete a LLMQuery document', async () => {
    const query = await LLMQuery.findOne({ query: 'another test query' });
    await query.deleteOne();
    const deletedQuery = await LLMQuery.findById(query._id);
    expect(deletedQuery).toBeNull();
  });

});

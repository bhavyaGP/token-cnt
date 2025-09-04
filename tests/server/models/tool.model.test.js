const mongoose = require('mongoose');
const Tool = require('./your-file-name'); // Replace your-file-name

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test-database', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Tool Model', () => {
  it('should create a new tool', async () => {
    const tool = new Tool({ toolId: 'tool1', name: 'Tool 1', description: 'Description 1', unlockLevel: 1 });
    await tool.save();
    expect(tool._id).toBeDefined();
  });

  it('should fail to create a tool without toolId', async () => {
    const tool = new Tool({ name: 'Tool 1', description: 'Description 1', unlockLevel: 1 });
    await expect(tool.save()).rejects.toThrow();
  });

  it('should fail to create a tool with duplicate toolId', async () => {
    const tool1 = new Tool({ toolId: 'tool2', name: 'Tool 2', description: 'Description 2', unlockLevel: 2 });
    await tool1.save();
    const tool2 = new Tool({ toolId: 'tool2', name: 'Tool 2', description: 'Description 2', unlockLevel: 2 });
    await expect(tool2.save()).rejects.toThrow();
  });

  it('should find a tool by toolId', async () => {
    const tool = new Tool({ toolId: 'tool3', name: 'Tool 3', description: 'Description 3', unlockLevel: 3 });
    await tool.save();
    const foundTool = await Tool.findOne({ toolId: 'tool3' });
    expect(foundTool.name).toBe('Tool 3');
  });

  it('should not find a tool with non-existent toolId', async () => {
    const foundTool = await Tool.findOne({ toolId: 'nonexistent' });
    expect(foundTool).toBeNull();
  });


  it('should update a tool', async () => {
    const tool = new Tool({ toolId: 'tool4', name: 'Tool 4', description: 'Description 4', unlockLevel: 4 });
    await tool.save();
    tool.name = 'Updated Tool 4';
    await tool.save();
    const updatedTool = await Tool.findById(tool._id);
    expect(updatedTool.name).toBe('Updated Tool 4');
  });

  it('should delete a tool', async () => {
    const tool = new Tool({ toolId: 'tool5', name: 'Tool 5', description: 'Description 5', unlockLevel: 5 });
    await tool.save();
    await Tool.findByIdAndDelete(tool._id);
    const deletedTool = await Tool.findById(tool._id);
    expect(deletedTool).toBeNull();
  });

  it('should handle invalid unlockLevel', async () => {
    const tool = new Tool({ toolId: 'tool6', name: 'Tool 6', description: 'Description 6', unlockLevel: 'invalid' });
    await expect(tool.save()).rejects.toThrow();
  });

  it('should handle null values correctly', async () => {
    const tool = new Tool({ toolId: 'tool7', name: null, description: null, unlockLevel: null });
    await tool.save();
    expect(tool.name).toBeNull();
    expect(tool.description).toBeNull();
    expect(tool.unlockLevel).toBeNull();
  });
});

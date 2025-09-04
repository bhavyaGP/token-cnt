const mongoose = require('mongoose');
const Inventory = require('./inventoryModel'); 

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/testDatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Inventory Model', () => {
  it('should create a new inventory document', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId(), tools: ['hammer', 'saw'] });
    await inventory.save();
    expect(inventory._id).toBeDefined();
  });

  it('should throw an error if user is not provided', async () => {
    const inventory = new Inventory({ tools: ['hammer', 'saw'] });
    await expect(inventory.save()).rejects.toThrow();
  });


  it('should add tools to the inventory', async () => {
    const inventory = await Inventory.findOne({user: new mongoose.Types.ObjectId()});
    inventory.tools.push('screwdriver');
    await inventory.save();
    expect(inventory.tools).toContain('screwdriver');
  });

  it('should handle empty tools array', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId(), tools: [] });
    await inventory.save();
    expect(inventory.tools).toEqual([]);
  });

  it('should retrieve inventory by user id', async () => {
    const userId = new mongoose.Types.ObjectId();
    const inventory = await Inventory.findOne({user: userId});
    expect(inventory.user.equals(userId)).toBe(true);

  });

  it('should handle cases with no inventory for a user', async () => {
    const inventory = await Inventory.findOne({user: new mongoose.Types.ObjectId()});
    expect(inventory).toBeNull();
  });

  it('should throw an error if user id is invalid', async () => {
    await expect(Inventory.findOne({user: 'invalid'})).rejects.toThrow();
  });

  it('should only allow one inventory per user', async () => {
    const userId = new mongoose.Types.ObjectId();
    const inventory1 = new Inventory({ user: userId, tools: ['hammer'] });
    await inventory1.save();
    const inventory2 = new Inventory({ user: userId, tools: ['saw'] });
    await expect(inventory2.save()).rejects.toThrow();
  });

});

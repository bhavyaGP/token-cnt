const mongoose = require('mongoose');
const InventoryItem = require('./inventoryItem'); // Assuming the code is in inventoryItem.js

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('InventoryItem Model', () => {
  it('should create a new inventory item', async () => {
    const item = new InventoryItem({ itemId: 'ITEM123', name: 'Test Item', cost: 100 });
    await item.save();
    expect(item._id).toBeDefined();
  });

  it('should fail to create a new inventory item with missing itemId', async () => {
    const item = new InventoryItem({ name: 'Test Item', cost: 100 });
    await expect(item.save()).rejects.toThrow();
  });

  it('should fail to create a new inventory item with missing name', async () => {
    const item = new InventoryItem({ itemId: 'ITEM123', cost: 100 });
    await expect(item.save()).rejects.toThrow();
  });

  it('should fail to create a new inventory item with missing cost', async () => {
    const item = new InventoryItem({ itemId: 'ITEM123', name: 'Test Item' });
    await expect(item.save()).rejects.toThrow();
  });

  it('should fail to create a new inventory item with duplicate itemId', async () => {
    const item1 = new InventoryItem({ itemId: 'ITEM456', name: 'Test Item 1', cost: 200 });
    await item1.save();
    const item2 = new InventoryItem({ itemId: 'ITEM456', name: 'Test Item 2', cost: 300 });
    await expect(item2.save()).rejects.toThrow();
  });


  it('should find an inventory item by ID', async () => {
    const item = new InventoryItem({ itemId: 'ITEM789', name: 'Find Item', cost: 50 });
    await item.save();
    const foundItem = await InventoryItem.findById(item._id);
    expect(foundItem.name).toBe('Find Item');
  });

  it('should find an inventory item by itemId', async () => {
    const item = new InventoryItem({ itemId: 'ITEM000', name: 'Find Item by ID', cost: 50 });
    await item.save();
    const foundItem = await InventoryItem.findOne({ itemId: 'ITEM000'});
    expect(foundItem.name).toBe('Find Item by ID');
  });

  it('should update an inventory item', async () => {
    const item = new InventoryItem({ itemId: 'ITEM101', name: 'Update Item', cost: 100 });
    await item.save();
    item.cost = 150;
    await item.save();
    const updatedItem = await InventoryItem.findById(item._id);
    expect(updatedItem.cost).toBe(150);
  });

  it('should delete an inventory item', async () => {
    const item = new InventoryItem({ itemId: 'ITEM102', name: 'Delete Item', cost: 100 });
    await item.save();
    await InventoryItem.findByIdAndDelete(item._id);
    const deletedItem = await InventoryItem.findById(item._id);
    expect(deletedItem).toBeNull();
  });

  it('should handle invalid cost', async () => {
    const item = new InventoryItem({ itemId: 'ITEM103', name: 'Invalid Cost', cost: 'abc' });
    await expect(item.save()).rejects.toThrow();
  });

  it('should handle null effect', async () => {
    const item = new InventoryItem({ itemId: 'ITEM104', name: 'Null Effect', cost: 100, effect: null });
    await item.save();
    expect(item.effect).toBeNull();
  })
});

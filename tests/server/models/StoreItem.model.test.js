const mongoose = require('mongoose');
const StoreItem = require('./your-file-name'); // Replace your-file-name

describe('StoreItem Model', () => {
  beforeAll(() => {
    return mongoose.connect('mongodb://localhost:27017/testdb', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(() => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await StoreItem.deleteMany({});
  });

  test('creates a new StoreItem', async () => {
    const item = await StoreItem.create({ itemId: 'abc1', name: 'Item 1', cost: 10, type: 'A' });
    expect(item.itemId).toBe('abc1');
    expect(item.name).toBe('Item 1');
    expect(item.cost).toBe(10);
    expect(item.type).toBe('A');
  });

  test('throws an error if itemId is missing', async () => {
    await expect(StoreItem.create({ name: 'Item 2', cost: 20, type: 'B' })).rejects.toThrow();
  });

  test('throws an error if name is missing', async () => {
    await expect(StoreItem.create({ itemId: 'abc2', cost: 20, type: 'B' })).rejects.toThrow();
  });

  test('throws an error if cost is missing', async () => {
    await expect(StoreItem.create({ itemId: 'abc3', name: 'Item 3', type: 'C' })).rejects.toThrow();
  });


  test('throws an error if type is missing', async () => {
    await expect(StoreItem.create({ itemId: 'abc4', name: 'Item 4', cost: 40})).rejects.toThrow();
  });

  test('throws an error if itemId is not unique', async () => {
    await StoreItem.create({ itemId: 'abc5', name: 'Item 5', cost: 50, type: 'D' });
    await expect(StoreItem.create({ itemId: 'abc5', name: 'Item 6', cost: 60, type: 'E' })).rejects.toThrow();
  });

  test('finds a StoreItem by itemId', async () => {
    const item = await StoreItem.create({ itemId: 'abc6', name: 'Item 6', cost: 60, type: 'E' });
    const foundItem = await StoreItem.findOne({ itemId: 'abc6' });
    expect(foundItem.itemId).toBe('abc6');
  });

  test('finds a StoreItem by name', async () => {
    const item = await StoreItem.create({ itemId: 'abc7', name: 'Item 7', cost: 70, type: 'F' });
    const foundItem = await StoreItem.findOne({ name: 'Item 7' });
    expect(foundItem.name).toBe('Item 7');
  });


  test('updates a StoreItem', async () => {
    const item = await StoreItem.create({ itemId: 'abc8', name: 'Item 8', cost: 80, type: 'G' });
    await StoreItem.updateOne({ itemId: 'abc8' }, { cost: 90 });
    const updatedItem = await StoreItem.findById(item._id);
    expect(updatedItem.cost).toBe(90);
  });

  test('deletes a StoreItem', async () => {
    const item = await StoreItem.create({ itemId: 'abc9', name: 'Item 9', cost: 90, type: 'H' });
    await StoreItem.deleteOne({ itemId: 'abc9' });
    const deletedItem = await StoreItem.findById(item._id);
    expect(deletedItem).toBeNull();
  });

  test('handles invalid cost', async () => {
    await expect(StoreItem.create({ itemId: 'abc10', name: 'Item 10', cost: 'abc', type: 'I' })).rejects.toThrow();
  });

  test('handles invalid itemId type', async () => {
    await expect(StoreItem.create({ itemId: 123, name: 'Item 11', cost: 110, type: 'J' })).rejects.toThrow();
  })
});

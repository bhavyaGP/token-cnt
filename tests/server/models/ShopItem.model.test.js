const mongoose = require('mongoose');
const ShopItem = require('./shopItem');

describe('ShopItem Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new ShopItem', async () => {
    const shopItem = new ShopItem({
      name: 'Test Item',
      price: 10.99,
    });
    await shopItem.save();
    expect(shopItem._id).toBeDefined();
    expect(shopItem.name).toBe('Test Item');
    expect(shopItem.price).toBe(10.99);
  });

  it('should fail to create a new ShopItem without a name', async () => {
    const shopItem = new ShopItem({
      price: 10.99,
    });
    await expect(shopItem.save()).rejects.toThrow();
  });

  it('should fail to create a new ShopItem without a price', async () => {
    const shopItem = new ShopItem({
      name: 'Test Item',
    });
    await expect(shopItem.save()).rejects.toThrow();
  });

  it('should create a new ShopItem with all fields', async () => {
    const shopItem = new ShopItem({
      name: 'Test Item 2',
      description: 'Test description',
      price: 20.99,
      image: 'test.jpg',
    });
    await shopItem.save();
    expect(shopItem._id).toBeDefined();
    expect(shopItem.name).toBe('Test Item 2');
    expect(shopItem.description).toBe('Test description');
    expect(shopItem.price).toBe(20.99);
    expect(shopItem.image).toBe('test.jpg');
  });

  it('should find a ShopItem by ID', async () => {
    const shopItem = await ShopItem.findById('6542e94165a4542a45678901');
    expect(shopItem).toBeDefined();
  });


  it('should handle finding a non-existent ShopItem', async () => {
    const shopItem = await ShopItem.findById('nonExistentId');
    expect(shopItem).toBeNull();
  });

  it('should update a ShopItem', async () => {
    const shopItem = await ShopItem.findOne({ name: 'Test Item 2' });
    shopItem.name = 'Updated Test Item';
    await shopItem.save();
    const updatedShopItem = await ShopItem.findOne({ name: 'Updated Test Item' });
    expect(updatedShopItem.name).toBe('Updated Test Item');
  });

  it('should delete a ShopItem', async () => {
    const shopItem = await ShopItem.findOne({ name: 'Updated Test Item' });
    const result = await ShopItem.deleteOne({ _id: shopItem._id });
    expect(result.deletedCount).toBe(1);
    const deletedShopItem = await ShopItem.findById(shopItem._id);
    expect(deletedShopItem).toBeNull();
  });

  it('should handle deleting a non-existent ShopItem', async () => {
    const result = await ShopItem.deleteOne({ _id: 'nonExistentId' });
    expect(result.deletedCount).toBe(0);
  });

});

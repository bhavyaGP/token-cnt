const ShopItem = require("../models/ShopItem.model");
const Inventory = require("../models/Inventory.model");
const StoreItem = require('../models/StoreItem.model');
const { listItems, buyItem, getStoreItems } = require("../controllers/shopController");

jest.mock("../models/ShopItem.model");
jest.mock("../models/Inventory.model");
jest.mock("../models/StoreItem.model");

describe("listItems", () => {
  it("should return a list of shop items", async () => {
    const mockItems = [{ name: "item1" }, { name: "item2" }];
    ShopItem.find.mockResolvedValue(mockItems);
    const req = {};
    const res = { json: jest.fn() };
    await listItems(req, res);
    expect(res.json).toHaveBeenCalledWith(mockItems);
  });
  it("should handle errors", async () => {
    ShopItem.find.mockRejectedValue(new Error("Failed to fetch shop items"));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await listItems(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch shop items" });
  });
});

describe("buyItem", () => {
  it("should buy an item successfully", async () => {
    const mockItem = { name: "item1", _id: "1" };
    const mockInventory = { user: "userId", tools: [], save: jest.fn() };
    ShopItem.findById.mockResolvedValue(mockItem);
    Inventory.findOne.mockResolvedValue(mockInventory);
    const req = { body: { itemId: "1" }, user: { _id: "userId" } };
    const res = { json: jest.fn() };
    await buyItem(req, res);
    expect(mockInventory.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Item bought successfully", tools: ["item1"] });
  });
  it("should handle item not found", async () => {
    ShopItem.findById.mockResolvedValue(null);
    const req = { body: { itemId: "1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Item not found" });
  });
  it("should handle errors", async () => {
    ShopItem.findById.mockRejectedValue(new Error("Failed to buy item"));
    const req = { body: { itemId: "1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to buy item" });
  });
  it("should add item to existing inventory", async () => {
    const mockItem = { name: "item1", _id: "1" };
    const mockInventory = { user: "userId", tools: ["item2"], save: jest.fn() };
    ShopItem.findById.mockResolvedValue(mockItem);
    Inventory.findOne.mockResolvedValue(mockInventory);
    const req = { body: { itemId: "1" }, user: { _id: "userId" } };
    const res = { json: jest.fn() };
    await buyItem(req, res);
    expect(mockInventory.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Item bought successfully", tools: ["item2", "item1"] });
  });
});

describe("getStoreItems", () => {
  it("should return a list of store items", async () => {
    const mockItems = [{ name: "storeItem1" }, { name: "storeItem2" }];
    StoreItem.find.mockResolvedValue(mockItems);
    const req = {};
    const res = { json: jest.fn() };
    await getStoreItems(req, res);
    expect(res.json).toHaveBeenCalledWith(mockItems);
  });
  it("should handle errors", async () => {
    StoreItem.find.mockRejectedValue(new Error("Failed to fetch store items"));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getStoreItems(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch store items" });
  });
});


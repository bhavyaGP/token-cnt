const {handlelogin, handlelogout, handleregister} = require('../src/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
jest.mock('../models/user.model');
jest.mock('jsonwebtoken');

describe('handlelogin', () => {
    let req, res;
    beforeEach(() => {
        req = {body: {}};
        res = {
            status: jest.fn(() => ({json: jest.fn()})),
            json: jest.fn()
        };
    });
    it('should return 400 if username or password is missing', async () => {
        await handlelogin(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message: 'Username and password are required'});
    });
    it('should return 401 if user is not found', async () => {
        req.body = {username: 'testuser', password: 'testpassword'};
        User.findOne.mockResolvedValue(null);
        await handlelogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({message: 'Invalid username or password'});
    });
    it('should return 200 if login is successful', async () => {
        const mockUser = {_id: '123'};
        req.body = {username: 'testuser', password: 'testpassword'};
        User.findOne.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mocktoken');
        await handlelogin(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({message: 'Login successful', user: mockUser, token: 'mocktoken'});
    });
    it('should handle errors during login', async () => {
        req.body = {username: 'testuser', password: 'testpassword'};
        User.findOne.mockRejectedValue(new Error('test error'));
        await handlelogin(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({message: 'Internal server error'});
    });
});

describe('handlelogout', () => {
    it('should return 200', () => {
        const req = {};
        const res = {status: jest.fn(() => ({json: jest.fn()}))};
        handlelogout(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({message: 'Logout successful'});
    });
});

describe('handleregister', () => {
    let req, res;
    beforeEach(() => {
        req = {body: {}};
        res = {
            status: jest.fn(() => ({json: jest.fn()})),
            json: jest.fn()
        };
    });
    it('should return 400 if username, password or email is missing', async () => {
        await handleregister(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message: 'Username, password, and email are required'});
    });
    it('should return 409 if username already exists', async () => {
        req.body = {username: 'testuser', password: 'testpassword', email: 'test@example.com'};
        User.findOne.mockResolvedValue({});
        await handleregister(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({message: 'Username already exists'});
    });
    it('should return 201 if user is registered successfully', async () => {
        req.body = {username: 'testuser', password: 'testpassword', email: 'test@example.com'};
        User.findOne.mockResolvedValue(null);
        User.mockImplementation(() => ({save: jest.fn()}));
        const newUser = {username: 'testuser', password: 'testpassword', email: 'test@example.com'};
        await handleregister(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({message: 'User registered successfully', user: newUser});

    });
    it('should handle errors during registration', async () => {
        req.body = {username: 'testuser', password: 'testpassword', email: 'test@example.com'};
        User.findOne.mockResolvedValue(null);
        User.mockImplementation(() => ({save: jest.fn(() => {throw new Error('test error');})}));
        await handleregister(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({message: 'Internal server error'});
    });
});


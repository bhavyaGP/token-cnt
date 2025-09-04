const mongoose = require('mongoose');
const db = require('./your_db_file'); // Replace your_db_file with the actual filename

jest.mock('mongoose');

describe('MongoDB Connection', () => {
    afterEach(() => {
        mongoose.disconnect.mockClear();
        mongoose.connect.mockClear();
        mongoose.set.mockClear();
        console.error.mockClear();
        console.log.mockClear();
    })

    test('connects to MongoDB with environment variable', () => {
        process.env.mongoUrl = 'mongodb://test:27017/testdb';
        expect(mongoose.connect).toHaveBeenCalledWith('mongodb://test:27017/testdb', { serverSelectionTimeoutMS: 30000 });
        expect(mongoose.set).toHaveBeenCalledWith('strictQuery', true);
    });

    test('connects to MongoDB with default URL', () => {
        delete process.env.mongoUrl;
        expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/playpower', { serverSelectionTimeoutMS: 30000 });
        expect(mongoose.set).toHaveBeenCalledWith('strictQuery', true);
    });

    test('handles connection error', () => {
        const mockError = new Error('Failed to connect');
        mongoose.connection.emit('error', mockError);
        expect(console.error).toHaveBeenCalledWith('Error connecting to MongoDB', mockError);
    });

    test('handles connection success', () => {
        mongoose.connection.emit('connected');
        expect(console.log).toHaveBeenCalledWith('✅Connected to MongoDB');
    });

    test('handles disconnection', () => {
        mongoose.connection.emit('disconnected');
        expect(console.log).toHaveBeenCalledWith('Disconnected from MongoDB');
    });

    test('exports the connection object', () => {
        expect(db).toBe(mongoose.connection);
    });


    test('sets strictQuery to true', () => {
        expect(mongoose.set).toHaveBeenCalledWith('strictQuery', true);
    });
});

jest.mock('dotenv');
jest.mock('@google/generative-ai');
jest.mock('../models/LLMQuery.model');
jest.mock('../models/Level.model');
jest.mock('axios');

const {giveHint, getHint, solveTask, askLLM, giveHintForLevel, getExplanationForLevel} = require('./ai');

const {GoogleGenerativeAI} = require('@google/generative-ai');
const LLMQuery = require('../models/LLMQuery.model');
const Level = require('../models/Level.model');
const axios = require('axios');

describe('giveHint', () => {
    it('should return a hint from the AI', async () => {
        const mockRequest = {body: {taskId: 1, playerInput: 'test input'}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockResolvedValue('test hint');
        await giveHint(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', hint: 'test hint'});
        mockMakeRateLimitedRequest.mockRestore();
    });
    it('should return a fallback hint if the AI fails', async () => {
        const mockRequest = {body: {taskId: 1, playerInput: 'test input'}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockRejectedValue(new Error('RATE_LIMIT'));
        await giveHint(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', hint: 'Check the connections in your circuit. Make sure the positive and negative terminals are connected correctly.'});
        mockMakeRateLimitedRequest.mockRestore();
    });
});

describe('getHint', () => {
    it('should return a hint from the Gemini API', async () => {
        const mockRequest = {body: {task: 'test task'}};
        const mockResponse = {json: jest.fn()};
        axios.post.mockResolvedValue({data: {candidates: [{content: {parts: [{text: 'test hint'}]}}]}});
        await getHint(mockRequest, mockResponse);
        expect(axios.post).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({hint: 'test hint'});
    });
    it('should return an error if the Gemini API fails', async () => {
        const mockRequest = {body: {task: 'test task'}};
        const mockResponse = {status: jest.fn(), json: jest.fn()};
        axios.post.mockRejectedValue(new Error('API error'));
        await getHint(mockRequest, mockResponse);
        expect(axios.post).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({error: 'LLM hint failed'});
    });
});

describe('solveTask', () => {
    it('should return a suggestion from the AI', async () => {
        const mockRequest = {body: {taskId: 1, problem: 'test problem', playerInput: 'test input'}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockResolvedValue('test suggestion');
        await solveTask(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', suggestion: 'test suggestion'});
        mockMakeRateLimitedRequest.mockRestore();
    });
    it('should return a fallback suggestion if the AI fails', async () => {
        const mockRequest = {body: {taskId: 1, problem: 'test problem', playerInput: 'test input'}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockRejectedValue(new Error('RATE_LIMIT'));
        await solveTask(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', suggestion: 'Try checking your circuit connections and make sure all components are properly connected.'});
        mockMakeRateLimitedRequest.mockRestore();
    });
});

describe('askLLM', () => {
    it('should return a response from the AI and save the query', async () => {
        const mockRequest = {body: {query: 'test query'}, user: {_id: 1}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockResolvedValue('test response');
        LLMQuery.create.mockResolvedValue({});
        await askLLM(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({response: 'test response'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, type: 'ask', query: 'test query', response: 'test response'});
        mockMakeRateLimitedRequest.mockRestore();
    });
    it('should return a fallback response if the AI fails', async () => {
        const mockRequest = {body: {query: 'test query'}, user: {_id: 1}};
        const mockResponse = {json: jest.fn()};
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockRejectedValue(new Error('RATE_LIMIT'));
        LLMQuery.create.mockResolvedValue({});
        await askLLM(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({response: 'Electric circuits work by allowing electric current to flow through a closed loop. The current is pushed by a power source like a battery and flows through wires to power devices like light bulbs.'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, type: 'ask', query: 'test query', response: 'Electric circuits work by allowing electric current to flow through a closed loop. The current is pushed by a power source like a battery and flows through wires to power devices like light bulbs.'});
        mockMakeRateLimitedRequest.mockRestore();
    });
});

describe('giveHintForLevel', () => {
    it('should return a hint for a given level', async () => {
        const mockRequest = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
        const mockResponse = {json: jest.fn(), status: jest.fn()};
        Level.findOne.mockResolvedValue({levelId: 1, question: 'test question'});
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockResolvedValue('test hint');
        LLMQuery.create.mockResolvedValue({});
        await giveHintForLevel(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', hint: 'test hint'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, levelId: 1, type: 'giveHintForLevel', query: 'test input', response: 'test hint'});
        mockMakeRateLimitedRequest.mockRestore();
    });
    it('should return a fallback hint if the level is not found', async () => {
        const mockRequest = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
        const mockResponse = {json: jest.fn(), status: jest.fn()};
        Level.findOne.mockResolvedValue(null);
        await giveHintForLevel(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({error: 'Level not found'});
    });
    it('should return a fallback hint if the AI fails', async () => {
        const mockRequest = {params: {levelId: 1}, body: {playerInput: 'test input'}, user: {_id: 1}};
        const mockResponse = {json: jest.fn()};
        Level.findOne.mockResolvedValue({levelId: 1, question: 'test question'});
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockRejectedValue(new Error('RATE_LIMIT'));
        LLMQuery.create.mockResolvedValue({});
        await giveHintForLevel(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({status: 'success', hint: 'Check what provides energy for electricity to flow in the circuit.'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, levelId: 1, type: 'giveHintForLevel', query: 'test input', response: 'Check what provides energy for electricity to flow in the circuit.'});
        mockMakeRateLimitedRequest.mockRestore();
    });
});

describe('getExplanationForLevel', () => {
    it('should return an explanation for a given level', async () => {
        const mockRequest = {params: {levelId: 1}, user: {_id: 1}};
        const mockResponse = {json: jest.fn()};
        Level.findOne.mockResolvedValue({levelId: 1, question: 'test question', correctAnswer: 'test answer'});
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockResolvedValue('test explanation');
        LLMQuery.create.mockResolvedValue({});
        await getExplanationForLevel(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({explanation: 'test explanation'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, levelId: 1, type: 'explanation', query: 'test question', response: 'test explanation'});
        mockMakeRateLimitedRequest.mockRestore();
    });
    it('should return a fallback explanation if the level is not found', async () => {
        const mockRequest = {params: {levelId: 1}, user: {_id: 1}};
        const mockResponse = {json: jest.fn(), status: jest.fn()};
        Level.findOne.mockResolvedValue(null);
        await getExplanationForLevel(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({error: 'Level not found'});
    });
    it('should return a fallback explanation if the AI fails', async () => {
        const mockRequest = {params: {levelId: 1}, user: {_id: 1}};
        const mockResponse = {json: jest.fn()};
        Level.findOne.mockResolvedValue({levelId: 1, question: 'test question', correctAnswer: 'test answer'});
        const mockMakeRateLimitedRequest = jest.spyOn(global, 'makeRateLimitedRequest').mockRejectedValue(new Error('RATE_LIMIT'));
        LLMQuery.create.mockResolvedValue({});
        await getExplanationForLevel(mockRequest, mockResponse);
        expect(mockMakeRateLimitedRequest).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith({explanation: 'A battery provides the electrical energy needed to power a circuit. Without a battery or power source, electricity cannot flow through the wires.'});
        expect(LLMQuery.create).toHaveBeenCalledWith({userId: 1, levelId: 1, type: 'explanation', query: 'test question', response: 'A battery provides the electrical energy needed to power a circuit. Without a battery or power source, electricity cannot flow through the wires.'});
        mockMakeRateLimitedRequest.mockRestore();
    });
});

describe('makeRateLimitedRequest', () => {
    it('should make a request and return the response', async () => {
        const mockModel = {generateContent: jest.fn().mockResolvedValue({response: {text: 'test response'}})};
        GoogleGenerativeAI.mockImplementation(() => ({getGenerativeModel: () => mockModel}));
        const response = await makeRateLimitedRequest('test prompt');
        expect(response).toBe('test response');
    });
    it('should handle rate limit errors', async () => {
        const mockModel = {generateContent: jest.fn().mockRejectedValue({status: 429})};
        GoogleGenerativeAI.mockImplementation(() => ({getGenerativeModel: () => mockModel}));
        await expect(makeRateLimitedRequest('test prompt')).rejects.toThrowError('RATE_LIMIT');
    });
    it('should handle other errors', async () => {
        const mockModel = {generateContent: jest.fn().mockRejectedValue(new Error('test error'))};
        GoogleGenerativeAI.mockImplementation(() => ({getGenerativeModel: () => mockModel}));
        await expect(makeRateLimitedRequest('test prompt')).rejects.toThrowError('test error');
    });
    it('should implement rate limiting', async () => {
        const mockModel = {generateContent: jest.fn().mockResolvedValue({response: {text: 'test response'}})};
        GoogleGenerativeAI.mockImplementation(() => ({getGenerativeModel: () => mockModel}));
        for (let i = 0; i < 13; i++) {
            await makeRateLimitedRequest('test prompt');
        }
    });
});

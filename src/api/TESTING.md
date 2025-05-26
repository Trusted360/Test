# Simmer API Testing Guide

This document provides guidelines for testing the Simmer API, focusing on proper setup and handling of dependencies like LangChain.

## Prerequisites

Before running tests, ensure you have the following dependencies installed:

```bash
npm install @langchain/core @langchain/community cheerio jest supertest
```

## Test Structure

Our tests are separated into two categories:

1. **Unit Tests**: Test individual components in isolation
   - Located in `src/*/tests` directories
   - Run with `npm test`

2. **Integration Tests**: Test multiple components working together
   - Located in `src/tests/integration`
   - Run with `npm run test:integration`

## Mocking LangChain Components

When testing workflows that use LangChain, you should properly mock the dependencies. Here's an example:

```javascript
// 1. Import LangChain components
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { Ollama } = require('@langchain/community/llms/ollama');

// 2. Mock the imports
jest.mock('@langchain/core/chains', () => ({
  LLMChain: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue({ text: 'mocked response' })
  }))
}));

jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@langchain/community/llms/ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({}))
}));
```

## Testing Workflows

Workflows should be tested with mocked LLM components:

1. Test input validation
2. Test error handling
3. Test the entire execution flow with mocked LLM responses

Example test structure:

```javascript
describe('WorkflowName', () => {
  let workflow;
  
  beforeEach(() => {
    // Setup workflow and mocks
    workflow = new WorkflowClass(config);
    workflow.chain = {
      call: jest.fn().mockResolvedValue({ 
        text: JSON.stringify(mockResponse) 
      })
    };
  });
  
  it('should validate input correctly', async () => {
    // Test input validation
  });
  
  it('should execute the workflow successfully', async () => {
    // Test complete execution
  });
  
  it('should handle errors', async () => {
    // Test error scenarios
  });
});
```

## Running Tests in Docker

You can run tests in a Docker environment using:

```bash
cd /path/to/simmer
docker-compose -f docker-compose.test.yml up api-test
```

## Debugging Tests

For verbose output, run tests with:

```bash
npm test -- --verbose
```

To debug a specific test file:

```bash
npm test -- --verbose path/to/test.js
``` 
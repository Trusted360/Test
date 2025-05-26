const BaseWorkflow = require('../base.workflow');
const { LLMChain } = require('@langchain/core/chains');
const { PromptTemplate } = require('@langchain/core/prompts');

// Mock the LangChain dependencies
jest.mock('@langchain/core/chains', () => ({
  LLMChain: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue({ text: 'mocked response' })
  })),
  BaseChain: jest.fn()
}));

jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: jest.fn().mockImplementation(() => ({}))
}));

// Create a simple test workflow class
class TestWorkflow extends BaseWorkflow {
  constructor(config = {}) {
    super(config);
  }

  async initialize() {
    const promptTemplate = new PromptTemplate({
      template: 'Test template with {input}',
      inputVariables: ['input'],
    });

    this.chain = new LLMChain({
      prompt: promptTemplate,
      llm: { name: 'mock_llm' } // This would normally be a real LLM
    });
  }

  async validateInput(input) {
    if (!input.testValue) {
      throw new Error('testValue is required');
    }
    return input;
  }
}

describe('Workflow Testing Example', () => {
  let workflow;

  beforeEach(() => {
    workflow = new TestWorkflow({ testConfig: 'value' });
    // Clear mocks between tests
    jest.clearAllMocks();
  });

  it('should initialize the workflow correctly', async () => {
    await workflow.initialize();
    
    expect(PromptTemplate).toHaveBeenCalledWith({
      template: 'Test template with {input}',
      inputVariables: ['input'],
    });
    
    expect(LLMChain).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.anything(),
      llm: expect.objectContaining({ name: 'mock_llm' })
    }));
  });

  it('should execute the workflow with valid input', async () => {
    // Setup mocked chain
    await workflow.initialize();
    
    // Execute with valid input
    const result = await workflow.execute({ testValue: 'test' });
    
    // Check that the chain was called with the right input
    expect(workflow.chain.call).toHaveBeenCalledWith({ testValue: 'test' });
    expect(result).toEqual({ text: 'mocked response' });
  });

  it('should throw error with invalid input', async () => {
    // Try to execute with invalid input
    await expect(workflow.validateInput({}))
      .rejects
      .toThrow('testValue is required');
  });
}); 
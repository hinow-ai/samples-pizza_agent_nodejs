#!/usr/bin/env node

/**
 * Simple Pizza Ordering Agent - Minimal Example
 * Demonstrates HINOW Hub API with function calling in steps
 */

const axios = require('axios');
require('dotenv').config();

// Step 1: Configuration from environment variables
const CONFIG = {
  API_URL: process.env.HINOW_API_URL || 'http://localhost:4103/v1/responses',
  BEARER_TOKEN: process.env.HINOW_API_KEY || 'mock-bearer-token-12345',
  MODEL: process.env.DEFAULT_MODEL || 'openai/gpt-4o-mini',
  PORT: process.env.APP_PORT || 4455  // Port for web server (if needed)
};

// Step 2: Mock Data
const PIZZAS = [
  { id: 'margherita', name: 'Margherita', price: 18.99 },
  { id: 'pepperoni', name: 'Pepperoni', price: 21.99 },
  { id: 'hawaiian', name: 'Hawaiian', price: 22.99 }
];

// Step 3: Tools Definition
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_pizza_menu',
      description: 'Get the list of available pizzas',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_order',
      description: 'Add a pizza to the order',
      parameters: {
        type: 'object',
        properties: {
          pizza_id: { type: 'string', description: 'ID of the pizza to add' },
          quantity: { type: 'number', description: 'Number of pizzas to add (default: 1)' }
        },
        required: ['pizza_id']
      }
    }
  }
];

// Step 4: Tool Functions
const toolFunctions = {
  get_pizza_menu: () => ({ pizzas: PIZZAS }),
  add_to_order: (args) => {
    const pizza = PIZZAS.find(p => p.id === args.pizza_id);
    if (!pizza) {
      return { error: 'Pizza not found' };
    }
    
    const quantity = args.quantity || 1;
    const message = quantity === 1 
      ? `Added ${pizza.name} ($${pizza.price}) to your order!`
      : `Added ${quantity}x ${pizza.name} ($${pizza.price} each) to your order!`;
    
    return { message };
  }
};

// Step 5: API Call Function
async function callHinowAPI(messages, tools) {
  try {
    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL,
      messages: messages,
      tools: tools,
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Step 6: Execute Tools Function
function executeTool(toolCall) {
  const toolName = toolCall.function.name;
  const toolArgs = JSON.parse(toolCall.function.arguments);
  
  console.log(`🔧 Executing: ${toolName}(${JSON.stringify(toolArgs)})`);
  
  return toolFunctions[toolName](toolArgs);
}

// Step 7: Process Conversation Function
async function processConversation(userMessage, conversationHistory) {
  // Add user message
  conversationHistory.push({ role: 'user', content: userMessage });
  
  // Get AI response
  const response = await callHinowAPI(conversationHistory, TOOLS);
  const choice = response.choices[0];
  const message = choice.message;
  
  // Handle tool calls
  if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
    console.log('🤖 AI wants to use tools...');
    
    // Add assistant message with tool calls
    conversationHistory.push(message);
    
    // Execute each tool
    for (const toolCall of message.tool_calls) {
      const toolResult = executeTool(toolCall);
      
      // Add tool result to conversation
      conversationHistory.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(toolResult)
      });
    }
    
    // Get final response after tools
    const finalResponse = await callHinowAPI(conversationHistory, TOOLS);
    const finalMessage = finalResponse.choices[0].message;
    
    console.log(`🍕 Assistant: ${finalMessage.content}`);
    conversationHistory.push(finalMessage);
    
  } else {
    // Direct response without tools
    console.log(`🍕 Assistant: ${message.content}`);
    conversationHistory.push(message);
  }
  
  return conversationHistory;
}

// Step 8: Main Function - Entry Point
async function main() {
  console.log('🍕 Simple Pizza Agent - HINOW Hub Demo');
  console.log('=====================================');
  console.log(`🔧 API URL: ${CONFIG.API_URL}`);
  console.log(`🔧 Model: ${CONFIG.MODEL}`);
  console.log(`🔧 Port: ${CONFIG.PORT}`);
  console.log(`🔧 Token: ${CONFIG.BEARER_TOKEN.substring(0, 10)}...`);
  console.log('');
  
  // Initialize conversation with system message
  const conversation = [{
    role: 'system',
    content: 'You are a pizza ordering assistant. Help customers browse the menu and add pizzas to their order. Use the provided tools when needed.'
  }];
  
  try {
    // Demo conversation flow
    console.log('📋 Step 1: Customer asks for menu');
    await processConversation('Show me the pizza menu', conversation);
    
    console.log('\n📋 Step 2: Customer orders a pizza');
    await processConversation('I want to order a Margherita pizza', conversation);
    
    console.log('\n📋 Step 3: Customer asks about another pizza');
    await processConversation('Do you have pepperoni pizza?', conversation);
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the demo
if (require.main === module) {
  main();
}
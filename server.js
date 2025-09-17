const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

// In-memory session storage (each user has their own cart)
const sessions = new Map();

// API Configuration
const CONFIG = {
  API_URL: process.env.HINOW_API_URL || 'http://localhost:4103/v1/responses',
  API_KEY: process.env.HINOW_API_KEY || 'mock-bearer-token-12345',
  MODEL: process.env.HINOW_DEFAULT_MODEL || 'openai/gpt-4o-mini'
};

// Available pizza data
const PIZZAS = [
  { id: 'margherita', name: 'Margherita', price: 18.99 },
  { id: 'pepperoni', name: 'Pepperoni', price: 21.99 },
  { id: 'hawaiian', name: 'Hawaiian', price: 22.99 }
];

// Number to pizza ID mapping (for easier use)
const PIZZA_MAP = {
  '1': 'margherita',
  '2': 'pepperoni', 
  '3': 'hawaiian'
};

// Tool definitions that the AI can use
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_pizza_menu',
      description: 'Shows the available pizza menu',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_order',
      description: 'Adds a pizza to the cart',
      parameters: {
        type: 'object',
        properties: {
          pizza_id: { type: 'string', description: 'Pizza ID (1, 2, 3 or name)' },
          quantity: { type: 'number', description: 'Number of pizzas to add (default: 1)' }
        },
        required: ['pizza_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'view_cart',
      description: 'Shows current cart with total',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description: 'Removes pizzas from cart',
      parameters: {
        type: 'object',
        properties: {
          pizza_id: { type: 'string', description: 'Pizza ID to remove' },
          quantity: { type: 'number', description: 'Quantity to remove (default: 1)' }
        },
        required: ['pizza_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_cart_item',
      description: 'Updates pizza quantity (0 = remove)',
      parameters: {
        type: 'object',
        properties: {
          pizza_id: { type: 'string', description: 'Pizza ID' },
          quantity: { type: 'number', description: 'New quantity (0 = remove)' }
        },
        required: ['pizza_id', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clear_cart',
      description: 'Clears entire cart',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// Helper function: gets or creates a user session
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { id: sessionId, cart: [] });
  }
  return sessions.get(sessionId);
}

// Helper function: finds pizza by ID or name
function findPizza(pizzaId) {
  // Convert number to ID if needed
  const id = PIZZA_MAP[pizzaId] || pizzaId.toLowerCase();
  
  // Search for the pizza
  return PIZZAS.find(p => 
    p.id === id || 
    p.name.toLowerCase() === id
  );
}

// Helper function: cleans message for API
function cleanMessage(message) {
  const cleaned = { ...message };
  
  // Remove null/undefined fields
  if (cleaned.name === null || cleaned.name === undefined) {
    delete cleaned.name;
  }
  if (cleaned.reasoning_content === null || cleaned.reasoning_content === undefined) {
    delete cleaned.reasoning_content;
  }
  
  return cleaned;
}

// Keep <think> tags to show AI thinking process on frontend

// TOOL IMPLEMENTATION

// 1. Show menu
function get_pizza_menu() {
  return { success: true, pizzas: PIZZAS };
}

// 2. Add to cart
function add_to_order(args, sessionId) {
  const pizza = findPizza(args.pizza_id);
  if (!pizza) {
    return { success: false, error: 'Pizza not found. Use: 1, 2, 3 or names' };
  }
  
  const quantity = args.quantity || 1;
  const session = getSession(sessionId);
  
  for (let i = 0; i < quantity; i++) {
    session.cart.push({
      id: pizza.id,
      name: pizza.name,
      price: pizza.price,
      addedAt: new Date()
    });
  }
  
  const message = quantity === 1 
    ? `🍕 ${pizza.name} added to cart!`
    : `🍕 ${quantity}x ${pizza.name} added to cart!`;
  
  return {
    success: true,
    message,
    cart_size: session.cart.length
  };
}

// 3. View cart
function view_cart(args, sessionId) {
  const session = getSession(sessionId);
  
  if (session.cart.length === 0) {
    return { success: true, message: 'Cart is empty', cart: [], total: 0 };
  }
  
  // Group pizzas and calculate total
  const summary = {};
  let total = 0;
  
  session.cart.forEach(item => {
    if (summary[item.id]) {
      summary[item.id].quantity += 1;
    } else {
      summary[item.id] = {
        name: item.name,
        price: item.price,
        quantity: 1
      };
    }
    total += item.price;
  });
  
  return {
    success: true,
    message: 'Your cart:',
    cart: Object.values(summary),
    total: total.toFixed(2)
  };
}

// 4. Remove from cart
function remove_from_cart(args, sessionId) {
  const pizza = findPizza(args.pizza_id);
  if (!pizza) {
    return { success: false, error: 'Pizza not found' };
  }
  
  const session = getSession(sessionId);
  const quantityToRemove = args.quantity || 1;
  let removedCount = 0;
  
  // Remove from list (from end to beginning)
  for (let i = session.cart.length - 1; i >= 0 && removedCount < quantityToRemove; i--) {
    if (session.cart[i].id === pizza.id) {
      session.cart.splice(i, 1);
      removedCount++;
    }
  }
  
  if (removedCount === 0) {
    return { success: false, error: `No ${pizza.name} in cart` };
  }
  
  return {
    success: true,
    message: `🗑️ Removed ${removedCount} ${pizza.name}`,
    removed_count: removedCount
  };
}

// 5. Update quantity
function update_cart_item(args, sessionId) {
  const pizza = findPizza(args.pizza_id);
  if (!pizza) {
    return { success: false, error: 'Pizza not found' };
  }
  
  const session = getSession(sessionId);
  let newQuantity = args.quantity;
  
  // Treat negatives as 0
  if (newQuantity < 0) newQuantity = 0;
  
  // Remove all instances of this pizza
  session.cart = session.cart.filter(item => item.id !== pizza.id);
  
  // Add new quantity
  for (let i = 0; i < newQuantity; i++) {
    session.cart.push({
      id: pizza.id,
      name: pizza.name,
      price: pizza.price,
      addedAt: new Date()
    });
  }
  
  const message = newQuantity === 0 ? 
    `🗑️ ${pizza.name} removed from cart` :
    `📝 ${pizza.name} updated to ${newQuantity}`;
  
  return { success: true, message, new_quantity: newQuantity };
}

// 6. Clear cart
function clear_cart(args, sessionId) {
  const session = getSession(sessionId);
  const itemCount = session.cart.length;
  session.cart = [];
  
  return {
    success: true,
    message: `🗑️ Cart cleared! ${itemCount} items removed`,
    total: 0
  };
}

// Function map (for easier execution)
const toolFunctions = {
  get_pizza_menu,
  add_to_order,
  view_cart,
  remove_from_cart,
  update_cart_item,
  clear_cart
};

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  const { messages, sessionId } = req.body;
  const currentSessionId = sessionId || uuidv4();
  
  try {
    // Remove messages with null content
    const cleanMessages = messages.filter(msg => msg.content !== null);
    
    // First call: send to AI with tools
    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL,
      messages: cleanMessages,
      tools: TOOLS,
      temperature: 0.3,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const choice = response.data.choices[0];
    const message = choice.message;

    // If AI wants to use tools
    if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
      // Clean assistant message before adding
      const cleanedMessage = cleanMessage(message);
      const updatedMessages = [...cleanMessages, cleanedMessage];
      
      // Execute each tool
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        
        // Handle different argument formats (DeepSeek sends "", others send "{}")
        let toolArgs = {};
        try {
          const argsString = toolCall.function.arguments || '{}';
          toolArgs = argsString.trim() === '' ? {} : JSON.parse(argsString);
        } catch (error) {
          console.log(`⚠️ Invalid arguments for ${toolName}:`, toolCall.function.arguments);
          toolArgs = {};
        }
        
        // Execute corresponding function
        const toolResult = toolFunctions[toolName](toolArgs, currentSessionId);
        
        // Add result to conversation
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }
      
      // Second call: request final response (without tools)
      const finalResponse = await axios.post(CONFIG.API_URL, {
        model: CONFIG.MODEL,
        messages: updatedMessages,
        temperature: 0.3,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const finalChoice = finalResponse.data.choices[0];
      const finalMessage = finalChoice.message.content;
      
      // If no response or truncated, create one based on tool result
      if (!finalMessage || finalMessage.trim() === '' || finalChoice.finish_reason === 'length') {
        const lastTool = updatedMessages[updatedMessages.length - 1];
        const toolResult = JSON.parse(lastTool.content);
        
        let fallbackMessage = 'Operation completed!';
        if (toolResult.message) fallbackMessage = toolResult.message;
        if (toolResult.error) fallbackMessage = '❌ ' + toolResult.error;
        if (lastTool.name === 'get_pizza_menu' && toolResult.pizzas) {
          fallbackMessage = '🍕 Pizza menu:\n\n';
          toolResult.pizzas.forEach((pizza, index) => {
            fallbackMessage += `${index + 1}. **${pizza.name}** - $${pizza.price}\n`;
          });
          fallbackMessage += '\nWhat would you like to order?';
        }
        
        res.json({ message: fallbackMessage, sessionId: currentSessionId });
      } else {
        res.json({ message: finalMessage, sessionId: currentSessionId });
      }
      
    } else {
      // Direct response (no tools) - check if should use tool
      let directMessage = message.content;
      
      // If mentioned menu but didn't use tool, force use
      const userLastMessage = cleanMessages[cleanMessages.length - 1]?.content?.toLowerCase() || '';
      if (userLastMessage.includes('menu')) {
        const menuResult = toolFunctions.get_pizza_menu({}, currentSessionId);
        directMessage = '🍕 Pizza menu:\n\n';
        menuResult.pizzas.forEach((pizza, index) => {
          directMessage += `${index + 1}. **${pizza.name}** - $${pizza.price}\n`;
        });
        directMessage += '\nWhat would you like to order?';
      }
      // If simple number, try to add to cart
      else if (/^[123]$/.test(userLastMessage.trim())) {
        const orderResult = toolFunctions.add_to_order({ pizza_id: userLastMessage.trim() }, currentSessionId);
        directMessage = orderResult.message || orderResult.error;
      }
      
      res.json({ message: directMessage, sessionId: currentSessionId });
    }
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ 
      error: 'Error processing request',
      sessionId: currentSessionId 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🍕 Pizza Agent running at http://localhost:${PORT}`);
  console.log(`🔧 Model: ${CONFIG.MODEL}`);
  console.log(`🔧 API: ${CONFIG.API_URL}`);
});
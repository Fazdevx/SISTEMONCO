const userService = require('../services/userService');
require('dotenv').config({ path: '../.env' });

async function test() {
  try {
    const users = await userService.getUsers();
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('First user structure:', JSON.stringify(users[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
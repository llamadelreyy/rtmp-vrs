// test-login.js - Test login functionality
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testLogin() {
  try {
    console.log('Testing login with testuser...');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'testuser',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3005'
      },
      withCredentials: true
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
    console.log('Status:', response.status);
    
    // Test with admin credentials too
    console.log('\nTesting login with admin...');
    
    const adminResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'secureAdminPassword'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3005'
      },
      withCredentials: true
    });
    
    console.log('Admin login successful!');
    console.log('Response:', adminResponse.data);
    console.log('Status:', adminResponse.status);
    
  } catch (error) {
    console.error('Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testLogin();
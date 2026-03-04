require('dotenv').config();
const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });
    console.log('Success!', response.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.status : err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

testLogin();

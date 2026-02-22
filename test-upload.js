const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, 'uploads', 'image-1770718383222.jpg');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  try {
    // In Node 22, fs.openAsBlob should be available
    const blob = await fs.openAsBlob(filePath);
    const formData = new FormData();
    formData.append('image', blob, 'image-1770718383222.jpg');

    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Test Error:', error);
  }
}

testUpload();

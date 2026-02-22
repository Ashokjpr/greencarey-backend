const fs = require('fs');
const path = require('path');

async function testWebPUpload() {
  // Use an existing jpg but pretend it's a webp for the upload
  const filePath = path.join(__dirname, 'uploads', 'image-1770718383222.jpg'); 
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  try {
    const blob = await fs.openAsBlob(filePath);
    const formData = new FormData();
    // Use .webp extension and image/webp mime type to test the filter
    formData.append('image', blob, 'test-image.webp'); 

    console.log('Attempting to upload test-image.webp...');

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

testWebPUpload();

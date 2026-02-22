const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../middleware/uploadMiddleware');

router.post('/', (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', err);
      if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
               return res.status(400).send({ message: 'Too many files or wrong field name. Expected "images".' });
          }
      }
      return res.status(400).send({ message: err.message || err });
    }
    console.log('Upload Success, Files:', req.files);
    
    // Handle both single file (req.file - fallback if single used) and multiple (req.files)
    // Actually upload.array populates req.files. 
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ message: 'No files uploaded' });
    }

    const filePaths = req.files.map(file => `/${file.path.replace(/\\/g, '/')}`);
    res.send(filePaths);
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Example routes
router.get('/', (req, res) => {
  res.json({ message: 'Get all posts' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create a new post' });
});

module.exports = router;

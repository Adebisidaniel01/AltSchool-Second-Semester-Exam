const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const authMiddleware = require('../middlewares/auth.middleware.js');



// public list & single blog (single blog increments read_count when published)
// list: GET /api/blogs?per_page=20&page=1&title=...&tags=tag1,tag2&author=...&sort_by=-read_count
router.get('/', blogController.listBlogs);

// get single blog - if published is public; if draft only owner can retrieve
// If you want to allow authenticated user to get drafts, use auth middleware optionally
router.get('/:id', authOptional, blogController.getBlog);

// helper to optionally attach req.user if token provided
function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return next();
  const authMiddleware = require('../middlewares/auth.middleware.js');

  return authMiddleware(req, res, next);
}

// the following require authentication (owner)
router.post('/', authMiddleware, blogController.createBlog);
router.put('/:id', authMiddleware, blogController.updateBlog);
router.patch('/:id/state', authMiddleware, blogController.changeState);
router.delete('/:id', authMiddleware, blogController.deleteBlog);

// list my blogs
router.get('/me/list', authMiddleware, blogController.listMyBlogs);

module.exports = router;

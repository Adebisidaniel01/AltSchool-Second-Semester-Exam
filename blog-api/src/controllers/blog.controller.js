const Blog = require('../models/blog.model');
const estimateReadingTime = require('../utils/readingTime');
const mongoose = require('mongoose');

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10);

// Create blog (owner must be logged in)
exports.createBlog = async (req, res, next) => {
  try {
    const { title, description, tags = [], body } = req.body;
    const reading_time = estimateReadingTime(body);
    const blog = await Blog.create({
      title,
      description,
      tags,
      body,
      author: req.user._id,
      reading_time, // draft state by default
    });
    res.status(201).json(blog);
  } catch (err) {
    next(err);
  }
};

// Update blog (owner)
exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    if (update.body) update.reading_time = estimateReadingTime(update.body);
    const blog = await Blog.findOneAndUpdate({ _id: id, author: req.user._id }, update, { new: true });
    if (!blog) return res.status(404).json({ message: 'Blog not found or not owned by you' });
    res.json(blog);
  } catch (err) {
    next(err);
  }
};

// Change state to published (owner)
exports.changeState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { state } = req.body;
    if (!['draft', 'published'].includes(state)) return res.status(400).json({ message: 'Invalid state' });
    const blog = await Blog.findOneAndUpdate({ _id: id, author: req.user._id }, { state }, { new: true });
    if (!blog) return res.status(404).json({ message: 'Blog not found or not owned by you' });
    res.json(blog);
  } catch (err) {
    next(err);
  }
};

// Delete blog (owner)
exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findOneAndDelete({ _id: id, author: req.user._id });
    if (!blog) return res.status(404).json({ message: 'Blog not found or not owned by you' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// Get single published blog (or if owner can get own draft/published) - increments read_count when published is returned to public
exports.getBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate('author', '-password');
    if (!blog) return res.status(404).json({ message: 'Not found' });

    // if requesting user is owner, return regardless of state
    const requestingUserId = req.user ? req.user._id.toString() : null;
    if (blog.state === 'draft' && blog.author._id.toString() !== requestingUserId) {
      return res.status(403).json({ message: 'Not accessible' });
    }

    // increment read_count when non-owner accesses a published blog (or anyone accesses published)
    if (blog.state === 'published') {
      blog.read_count = (blog.read_count || 0) + 1;
      await blog.save();
    }

    res.json(blog);
  } catch (err) {
    next(err);
  }
};

// Get list of published blogs (public) with pagination, filter by state, search & order
exports.listBlogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      per_page = DEFAULT_PAGE_SIZE,
      state, // optional filter by state
      author, // search by author name
      title, // search by title
      tags, // comma separated tags
      sort_by // read_count, reading_time, createdAt or -createdAt etc
    } = req.query;

    const skip = (Number(page) - 1) * Number(per_page);

    // Build query - default for public: only published. If logged in and wants, they can filter by their blogs using authorId param or state param and authentication.
    const query = {};

    // If state filter provided, use it
    if (state) query.state = state;
    else query.state = 'published'; // default for public list

    // search by title (partial)
    if (title) query.title = { $regex: title, $options: 'i' };

    // tags filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    // author search by first/last name: need to join: find users matching name then filter by their ids
    let authorIds = null;
    if (author) {
      const User = require('../models/user.model');
      const users = await User.find({
        $or: [
          { first_name: { $regex: author, $options: 'i' } },
          { last_name: { $regex: author, $options: 'i' } },
          { email: { $regex: author, $options: 'i' } }
        ]
      }).select('_id');
      authorIds = users.map(u => u._id);
      query.author = { $in: authorIds };
    }

    const sort = {};
    if (sort_by) {
      // support comma separated sort like "-read_count,createdAt"
      const fields = sort_by.split(',');
      fields.forEach(f => {
        f = f.trim();
        if (!f) return;
        if (f.startsWith('-')) sort[f.slice(1)] = -1;
        else sort[f] = 1;
      });
    } else {
      sort.createdAt = -1; // default latest
    }

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .populate('author', '-password')
      .sort(sort)
      .skip(skip)
      .limit(Number(per_page));

    res.json({
      meta: {
        page: Number(page),
        per_page: Number(per_page),
        total,
        total_pages: Math.ceil(total / Number(per_page))
      },
      data: blogs
    });
  } catch (err) {
    next(err);
  }
};

// Get list of blogs for current user (owner) with pagination & filters
exports.listMyBlogs = async (req, res, next) => {
  try {
    const { page = 1, per_page = DEFAULT_PAGE_SIZE, state, title, tags, sort_by } = req.query;
    const skip = (Number(page) - 1) * Number(per_page);
    const query = { author: req.user._id };
    if (state) query.state = state;
    if (title) query.title = { $regex: title, $options: 'i' };
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }
    const sort = {};
    if (sort_by) {
      const fields = sort_by.split(',');
      fields.forEach(f => {
        f = f.trim();
        if (!f) return;
        if (f.startsWith('-')) sort[f.slice(1)] = -1;
        else sort[f] = 1;
      });
    } else sort.createdAt = -1;

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query).sort(sort).skip(skip).limit(Number(per_page));
    res.json({
      meta: {
        page: Number(page), per_page: Number(per_page), total, total_pages: Math.ceil(total / Number(per_page))
      },
      data: blogs
    });
  } catch (err) {
    next(err);
  }
};

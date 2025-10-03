// server.js
import express from 'express';
import chalk from 'chalk';

const app = express();
const PORT = 3000;

// Middleware to parse JSON body
app.use(express.json());

// In-memory blog storage
let blogs = [];

// ===== GET all blogs =====
app.get('/blogs', (req, res) => {
  res.status(200).json({
    message: 'All blogs retrieved successfully',
    data: blogs
  });
});

// ===== GET single blog by ID =====
app.get('/blogs/:id', (req, res) => {
  const blog = blogs.find(b => b.id === parseInt(req.params.id));
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  res.status(200).json({ data: blog });
});

// ===== POST a new blog =====
app.post('/blogs', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  const newBlog = {
    id: blogs.length + 1,
    title,
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  blogs.push(newBlog);

  res.status(201).json({
    message: 'Blog created successfully',
    data: newBlog
  });
});

// ===== PUT update blog by ID =====
app.put('/blogs/:id', (req, res) => {
  const blog = blogs.find(b => b.id === parseInt(req.params.id));
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  const { title, content } = req.body;
  if (!title && !content) {
    return res.status(400).json({ message: 'At least one field (title or content) is required to update' });
  }

  if (title) blog.title = title;
  if (content) blog.content = content;
  blog.updatedAt = new Date();

  res.status(200).json({
    message: 'Blog updated successfully',
    data: blog
  });
});

// ===== DELETE blog by ID =====
app.delete('/blogs/:id', (req, res) => {
  const index = blogs.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  const deletedBlog = blogs.splice(index, 1)[0];
  res.status(200).json({
    message: 'Blog deleted successfully',
    data: deletedBlog
  });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(chalk.green(`Server running on http://localhost:${PORT}`));
});

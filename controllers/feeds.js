const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  const page = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
    res.json({
      message: 'Fetched posts successfully',
      posts,
      totalItems
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    return next(error);
  }
  const { title, content } = req.body;
  if (!req.file) {
    const error = new Error('No image provided');
    error.statusCode = 422;
    return next(error);
  }
  const imageUrl = req.file.path;
  let post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId
  });
  try {
    post = await post.save();
    let user = await User.findById(req.userId);
    user.posts.push(post._id);
    user = await user.save();
    io.getIO().emit('posts', {
      action: 'create',
      post: {
        ...post._doc,
        creator: { _id: user._id.toString(), name: user.name }
      }
    });
    res.status(201).json({
      message: 'Post created successfully',
      post,
      creator: { _id: user._id.toString(), name: user.name }
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post');
      error.statusCode = 422;
      throw error;
    }
    res.json({ message: 'Post fetched', post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  let error;
  if (!errors.isEmpty()) {
    error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    return next(error);
  }
  const { postId } = req.params;
  const { title, content } = req.body;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    error = new Error('No file picked');
    error.statusCode = 422;
    return next(error);
  }
  try {
    let post = await Post.findById(postId).populate('creator');
    if (!post) {
      error = new Error('Could not find post');
      error.statusCode = 422;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;
    post = await post.save();
    io.getIO().emit('posts', { action: 'update', post });
    res.json({
      message: 'Post updated ',
      post
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;
  let error;
  try {
    let post = await Post.findById(postId);
    if (!post) {
      error = new Error('Could not find post');
      error.statusCode = 422;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    let user = await User.findById(req.userId);
    user.posts.pull(postId);
    user = await user.save();
    io.getIO().emit('posts', { action: 'delete', post: postId });
    res.json({ message: 'Deleted post' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = filePath => {
  filePath = path.resolve(__dirname, '..', filePath);
  fs.unlink(filePath, err => {
    if (err) {
      console.error(err);
    }
  });
};

const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../util/file');

module.exports = {
  async createUser({ userInput }, req) {
    const { email, name, password } = userInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: 'E-mail is invalid' });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short' });
    }
    let error;
    if (errors.length > 0) {
      error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const entry = await User.findOne({ email });
    if (entry) {
      error = new Error('User exists already!');
      throw error;
    }
    const hash = await bcrypt.hash(password, 12);
    let user = new User({ email, name, password: hash });
    user = await user.save();
    return { ...user._doc, _id: user._id.toString() };
  },

  async login({ email, password }, req) {
    const user = await User.findOne({ email });
    let error;
    if (!user) {
      error = new Error('User not found');
      error.code = 401;
      throw error;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      error = new Error('Password is incorrent');
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      'secret',
      { expiresIn: '1h' }
    );
    return { token, userId: user._id.toString() };
  },

  async createPost({ postInput }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid' });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid' });
    }
    if (errors.length > 0) {
      error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    let user = await User.findById(req.userId);
    if (!user) {
      error = new Error('Invalid user');
      error.code = 401;
      throw error;
    }
    let post = new Post({ title, content, imageUrl, creator: user });
    post = await post.save();
    user.posts.push(post);
    await user.save();
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  },

  async posts({ page = 1 }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');
    return {
      posts: posts.map(p => ({
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      })),
      totalPosts
    };
  },

  async post({ id }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      error = new Error('No post found');
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  },

  async updatePost({ id, postInput }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    let post = await Post.findById(id).populate('creator');
    if (!post) {
      error = new Error('No post found');
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      error = new Error('Not Authorized');
      error.code = 403;
      throw error;
    }
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid' });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid' });
    }
    if (errors.length > 0) {
      error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== 'undefined') {
      post.imageUrl = imageUrl;
    }
    post = await post.save();
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  },

  async deletePost({ id }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      error = new Error('No post found');
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      error = new Error('Not Authorized');
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    let user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },

  async user(_, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      error = new Error('No user found');
      error.code = 404;
      throw error;
    }
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  },

  async updateStatus({ status }, req) {
    let error;
    if (!req.isAuth) {
      error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    let user = await User.findById(req.userId);
    if (!user) {
      error = new Error('No user found');
      error.code = 404;
      throw error;
    }
    user.status = status;
    user = await user.save();
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  }
};

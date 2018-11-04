const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { name, email, password } = req.body;
  try {
    const hashPassword = await bcrypt.hash(password, 12);
    let user = new User({ email, password: hashPassword, name });
    user = await user.save();
    res.status(201).json({
      message: 'User created ',
      userId: user._id
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  let error;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      error = new Error('A user with this email could not be found');
      error.statusCode = 401;
      throw error;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      error = new Error('Wrong password');
      error.statusCode = 401;
      throw error;
    }
    const userId = user._id.toString();
    const token = jwt.sign(
      {
        email: user.email,
        userId
      },
      'secret',
      { expiresIn: '1h' }
    );
    res.json({ userId, token });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  const errors = validationResult(req);
  let error;
  if (!errors.isEmpty()) {
    error = new Error('Validation failed');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  const { status } = req.body;
  try {
    let user = await User.findById(req.userId);
    if (!user) {
      error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    user.status = status;
    user = await user.save();
    res.json({ message: 'User updated' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

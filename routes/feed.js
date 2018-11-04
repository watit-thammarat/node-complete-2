const express = require('express');
const { body } = require('express-validator/check');

const feedController = require('../controllers/feeds');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/posts', isAuth, feedController.getPosts);

router.post(
  '/post',
  isAuth,
  [
    body('title')
      .trim()
      .isString()
      .isLength({ min: 5 }),
    body('content')
      .trim()
      .isString()
      .isLength({ min: 5 })
  ],
  feedController.addPost
);

router.get('/post/:postId', isAuth, feedController.getPost);

router.put(
  '/post/:postId',
  isAuth,
  [
    body('title')
      .trim()
      .isString()
      .isLength({ min: 5 }),
    body('content')
      .trim()
      .isString()
      .isLength({ min: 5 })
  ],
  feedController.updatePost
);

router.delete('/post/:postId', isAuth, feedController.deletePost);

module.exports = router;

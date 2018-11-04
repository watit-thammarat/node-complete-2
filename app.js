const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const grapqlHttp = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');

const MONGODB_URI = 'mongodb://localhost:27017/messages';
const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().getTime()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(cors());
app.use(morgan('dev'));
app.use('/images', express.static(path.resolve(__dirname, 'images')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  res.status(201).json({ message: 'File stored', filePath: req.file.path });
});

app.use(
  '/graphql',
  grapqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data || null;
      const message = err.message || 'An error occurred';
      const code = err.originalError.code || 500;
      return { message, data, code };
    }
  })
);

app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const data = err.data || undefined;
  res.status(statusCode).json({ message: err.message, data });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(8080, () => console.log('Server started at port 8080'));
  })
  .catch(err => console.error(err));

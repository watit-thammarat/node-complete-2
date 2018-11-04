const fs = require('fs');
const path = require('path');

exports.clearImage = filePath => {
  filePath = path.resolve(__dirname, '..', filePath);
  fs.unlink(filePath, err => {
    if (err) {
      console.error(err);
    }
  });
};

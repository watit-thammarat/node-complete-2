let io;

module.exports = {
  init: httpServer => {
    io = require('socket.io')(httpServer);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  }
};

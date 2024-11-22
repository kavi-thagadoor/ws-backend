// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://kavi:vwreKKd9BDBFVFxT@cluster0.qqbgvgo.mongodb.net/test')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
// User Schema and Model
const userSchema = new mongoose.Schema({
  name: String,
});
const User = mongoose.model('User', userSchema);

// REST API to get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  console.log(users)
  res.json(users);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send existing users when a client connects
  User.find().then(users => {
    socket.emit('updateUserList', users);
  });

  // Listen for new user data
  socket.on('addUser', async (userData) => {
    const newUser = new User(userData);
    await newUser.save();

    // Broadcast the updated user list to all clients
    const users = await User.find();
    io.emit('updateUserList', users);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

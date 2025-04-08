const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
var jwt = require('jsonwebtoken');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect('mongodb+srv://kavi:QH9YqbUehzJxhQDz@cluster0.qqbgvgo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/test3', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Ensure unique names
});
const User = mongoose.model('User', userSchema);

// REST API to fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send existing users when a client connects
  User.find().then((users) => {
    socket.emit('updateUserList', users);
  });

  socket.on('addUser', async (userData, callback) => {
    // Validate callback function
    if (typeof callback !== 'function') {
      console.error('No callback provided for addUser');
      return;
    }
  
    try {
      // Insert new user into the database
      const newUser = new User(userData);
      await newUser.save();
  
      // Generate JWT token
      jwt.sign(
        { userData },
        'iuytrs65432gfd', // Secret key
        { algorithm: 'HS256', expiresIn: '1h' }, // Options (HS256 used here for simplicity)
        async (err, token) => {
          if (err) {
            console.error('Error generating JWT:', err.message);
  
            // Respond to the client with error
            callback({ success: false, message: 'Failed to generate token' });
            return;
          }
  
          // Respond to the client with success and token
          callback({ success: true, message: token });
  
          // Broadcast updated user list to all clients
          const users = await User.find();
          io.emit('updateUserList', users);
        }
      );
    } catch (error) {
      console.error('Error inserting user:', error.message);
  
      // Respond to the client with error
      callback({ success: false, message: error.message });
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

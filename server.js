require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize } = require('sequelize');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Database Connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'stock_screener',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// Models
const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  username: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: true
  },
  avatar: {
    type: Sequelize.STRING,
    defaultValue: null
  },
  bio: {
    type: Sequelize.STRING,
    defaultValue: ''
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  isApproved: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  approvedAt: {
    type: Sequelize.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

const Message = sequelize.define('Message', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  senderId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  receiverId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  isRead: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

const AdminSettings = sequelize.define('AdminSettings', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  wallpaperUrl: {
    type: Sequelize.STRING,
    defaultValue: null
  },
  wallpaperUploadedBy: {
    type: Sequelize.INTEGER,
    references: { model: 'Users', key: 'id' }
  }
}, {
  timestamps: true
});

// Routes
const authRoutes = require('./routes/auth')(sequelize, User);
const userRoutes = require('./routes/users')(sequelize, User);
const messageRoutes = require('./routes/messages')(sequelize, Message, User);
const adminRoutes = require('./routes/admin')(sequelize, AdminSettings, User);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io for real-time messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { senderId, receiverId, content } = data;
      
      // Save to DB
      const message = await Message.create({
        senderId,
        receiverId,
        content
      });

      // Send to receiver in real-time
      io.to(`user-${receiverId}`).emit('receive-message', {
        id: message.id,
        senderId,
        receiverId,
        content,
        createdAt: message.createdAt,
        senderUsername: data.senderUsername
      });
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Database: ${process.env.DB_HOST || 'localhost'}`);
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err);
});

module.exports = { app, sequelize, io };

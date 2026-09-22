const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};

module.exports = (sequelize, Message, User) => {
  // GET CONVERSATION WITH USER
  router.get('/conversation/:receiverId', verifyToken, async (req, res) => {
    try {
      const { receiverId } = req.params;
      const { senderId: userId } = { senderId: req.userId };

      // Get all messages between these two users
      const messages = await Message.findAll({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { senderId: userId, receiverId },
            { senderId: receiverId, receiverId: userId }
          ]
        },
        order: [['createdAt', 'ASC']],
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
          { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] }
        ]
      });

      // Mark messages as read
      await Message.update(
        { isRead: true },
        { where: { receiverId: userId, senderId: receiverId, isRead: false } }
      );

      res.json({ ok: true, messages });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // SEND MESSAGE (via HTTP - Socket.io sends real-time)
  router.post('/send', verifyToken, async (req, res) => {
    try {
      const { receiverId, content } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({ ok: false, error: 'Receiver and content required' });
      }

      const message = await Message.create({
        senderId: req.userId,
        receiverId,
        content
      });

      // Fetch sender info
      const sender = await User.findByPk(req.userId, {
        attributes: ['username', 'avatar']
      });

      res.json({
        ok: true,
        message: {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          createdAt: message.createdAt,
          sender
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET INBOX (all conversations)
  router.get('/inbox', verifyToken, async (req, res) => {
    try {
      const userId = req.userId;

      // Get latest message from each conversation
      const conversations = await sequelize.query(`
        SELECT DISTINCT ON (CASE 
          WHEN "senderId" = ${userId} THEN "receiverId" 
          ELSE "senderId" 
        END)
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId" 
            ELSE "senderId" 
          END as "otherUserId",
          *
        FROM "Messages"
        WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
        ORDER BY CASE 
          WHEN "senderId" = ${userId} THEN "receiverId" 
          ELSE "senderId" 
        END, "createdAt" DESC
      `, { type: sequelize.QueryTypes.SELECT });

      // Enrich with user data
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          const otherUser = await User.findByPk(conv.otherUserId, {
            attributes: ['id', 'username', 'avatar']
          });
          return {
            ...conv,
            otherUser,
            unreadCount: await Message.count({
              where: {
                senderId: conv.otherUserId,
                receiverId: userId,
                isRead: false
              }
            })
          };
        })
      );

      res.json({ ok: true, conversations: enriched });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Mark messages as read
  router.put('/mark-read/:senderId', verifyToken, async (req, res) => {
    try {
      await Message.update(
        { isRead: true },
        { where: { senderId: req.params.senderId, receiverId: req.userId, isRead: false } }
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Associate User models for includes
  User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
  User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

  return router;
};

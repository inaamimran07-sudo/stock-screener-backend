const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

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

module.exports = (sequelize, User) => {
  // GET USER PROFILE
  router.get('/me', verifyToken, async (req, res) => {
    try {
      const user = await User.findByPk(req.userId, {
        attributes: ['id', 'email', 'username', 'avatar', 'bio', 'isAdmin']
      });

      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      res.json({ ok: true, user });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET ALL USERS (for messaging)
  router.get('/all', verifyToken, async (req, res) => {
    try {
      const users = await User.findAll({
        where: { isApproved: true },
        attributes: ['id', 'email', 'username', 'avatar', 'bio']
      });

      res.json({ ok: true, users });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // SET USERNAME (first time setup)
  router.post('/set-username', verifyToken, async (req, res) => {
    try {
      const { username } = req.body;

      if (!username || username.length < 3) {
        return res.status(400).json({ ok: false, error: 'Username must be at least 3 characters' });
      }

      // Check if username is taken
      const existing = await User.findOne({ where: { username } });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'Username already taken' });
      }

      const user = await User.findByPk(req.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      await user.update({ username });
      res.json({ ok: true, message: 'Username set', username });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // UPLOAD AVATAR
  router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No file uploaded' });
      }

      const user = await User.findByPk(req.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      // Delete old avatar if exists
      if (user.avatar) {
        try {
          fs.unlinkSync(user.avatar);
        } catch (e) {
          // File might not exist
        }
      }

      const avatarPath = `/avatars/${req.file.filename}`;
      await user.update({ avatar: avatarPath });

      res.json({ ok: true, message: 'Avatar uploaded', avatar: avatarPath });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // UPDATE PROFILE (bio, username, etc)
  router.put('/profile', verifyToken, async (req, res) => {
    try {
      const { username, bio } = req.body;

      const user = await User.findByPk(req.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      const updates = {};
      if (username) updates.username = username;
      if (bio) updates.bio = bio;

      await user.update(updates);
      res.json({ ok: true, message: 'Profile updated', user });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET USER BY ID
  router.get('/:userId', async (req, res) => {
    try {
      const user = await User.findByPk(req.params.userId, {
        attributes: ['id', 'email', 'username', 'avatar', 'bio']
      });

      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      res.json({ ok: true, user });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
};

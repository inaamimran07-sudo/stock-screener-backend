const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Setup multer for wallpaper uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/wallpapers';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `wallpaper-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;
    
    if (!req.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Admin only' });
    }
    next();
  } catch (error) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};

module.exports = (sequelize, AdminSettings, User) => {
  // UPLOAD WALLPAPER (Admin only)
  router.post('/upload-wallpaper', verifyAdmin, upload.single('wallpaper'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No file uploaded' });
      }

      // Get or create admin settings
      let settings = await AdminSettings.findOne();
      if (!settings) {
        settings = await AdminSettings.create({ wallpaperUploadedBy: req.userId });
      }

      // Delete old wallpaper
      if (settings.wallpaperUrl) {
        try {
          fs.unlinkSync(settings.wallpaperUrl);
        } catch (e) {
          // File might not exist
        }
      }

      const wallpaperPath = `/wallpapers/${req.file.filename}`;
      await settings.update({
        wallpaperUrl: wallpaperPath,
        wallpaperUploadedBy: req.userId
      });

      res.json({
        ok: true,
        message: 'Wallpaper uploaded successfully',
        wallpaper: wallpaperPath
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET CURRENT WALLPAPER (everyone)
  router.get('/wallpaper', async (req, res) => {
    try {
      const settings = await AdminSettings.findOne();
      const wallpaper = settings?.wallpaperUrl || null;

      res.json({ ok: true, wallpaper });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // SET WALLPAPER FROM URL (Admin only)
  router.post('/set-wallpaper-url', verifyAdmin, async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ ok: false, error: 'URL required' });
      }

      let settings = await AdminSettings.findOne();
      if (!settings) {
        settings = await AdminSettings.create({ wallpaperUploadedBy: req.userId });
      }

      await settings.update({
        wallpaperUrl: url,
        wallpaperUploadedBy: req.userId
      });

      res.json({
        ok: true,
        message: 'Wallpaper URL set',
        wallpaper: url
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET ALL APPROVED USERS (Admin only)
  router.get('/users', verifyAdmin, async (req, res) => {
    try {
      const users = await User.findAll({
        where: { isApproved: true },
        attributes: ['id', 'email', 'username', 'avatar', 'isAdmin', 'approvedAt']
      });

      res.json({ ok: true, users });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // MAKE USER ADMIN (Admin only)
  router.post('/promote-admin/:userId', verifyAdmin, async (req, res) => {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      await user.update({ isAdmin: true });
      res.json({ ok: true, message: 'User promoted to admin' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // REMOVE ADMIN (Admin only)
  router.post('/demote-admin/:userId', verifyAdmin, async (req, res) => {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      await user.update({ isAdmin: false });
      res.json({ ok: true, message: 'Admin removed' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // DELETE USER (Admin only)
  router.delete('/delete-user/:userId', verifyAdmin, async (req, res) => {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      // Delete avatar
      if (user.avatar) {
        try {
          fs.unlinkSync(user.avatar);
        } catch (e) {}
      }

      await user.destroy();
      res.json({ ok: true, message: 'User deleted' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
};

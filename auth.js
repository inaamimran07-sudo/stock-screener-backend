const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (sequelize, User) => {
  // SIGNUP
  router.post('/signup', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ ok: false, error: 'Email and password required' });
      }

      // Check if user exists
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        isApproved: email === process.env.ADMIN_EMAIL || false
      });

      return res.json({
        ok: true,
        status: user.isApproved ? 'Admin account created' : 'Account created - awaiting approval'
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // LOGIN
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ ok: false, error: 'Email and password required' });
      }

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
      }

      // Check if approved
      if (!user.isApproved) {
        return res.status(403).json({ ok: false, error: 'Account pending approval' });
      }

      // Check password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.isAdmin },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET PENDING USERS (Admin only)
  router.get('/pending-users', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isAdmin) {
        return res.status(403).json({ ok: false, error: 'Admin only' });
      }

      const pending = await User.findAll({
        where: { isApproved: false },
        attributes: ['id', 'email', 'createdAt']
      });

      res.json({ pending });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // APPROVE USER (Admin only)
  router.post('/approve-user/:userId', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const admin = await User.findByPk(decoded.userId);

      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ ok: false, error: 'Admin only' });
      }

      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      await user.update({
        isApproved: true,
        approvedAt: new Date()
      });

      res.json({ ok: true, message: 'User approved' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // DENY USER (Admin only)
  router.post('/deny-user/:userId', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const admin = await User.findByPk(decoded.userId);

      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ ok: false, error: 'Admin only' });
      }

      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      await user.destroy();
      res.json({ ok: true, message: 'User denied and removed' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
};

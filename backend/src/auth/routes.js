const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('./models');
// Using a simple mock hash for MVP since bcrypt is not installed.
// In a real app, use bcrypt or argon2.

router.post('/register', async (req, res, next) => {
  try {
    const { name, phone, password, role } = req.body;
    
    // Check if user exists
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: { code: 'USER_EXISTS', message: 'User with this phone already exists.' }});
    }

    const user = await User.create({
      name,
      phone,
      password_hash: password, // MOCK hashing
      role: role || 'FARMER'
    });

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ where: { phone } });

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password.' }});
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

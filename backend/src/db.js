const { Sequelize } = require('sequelize');

// Switching to SQLite for easy local testing without Docker
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

module.exports = { sequelize };

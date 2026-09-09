const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { User } = require('../auth/models');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('VACCINATION_DUE', 'CASE_UPDATED', 'HIGH_RISK_DETECTED', 'SYSTEM'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'alerts',
  timestamps: true,
});

User.hasMany(Alert, { foreignKey: 'user_id' });
Alert.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { Alert };

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { User } = require('../auth/models');

const Animal = sequelize.define('Animal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tag_id: {
    type: DataTypes.STRING,
    unique: true,
  },
  species: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  breed: {
    type: DataTypes.STRING,
  },
  age: {
    type: DataTypes.INTEGER, // in months
  },
  sex: {
    type: DataTypes.ENUM('MALE', 'FEMALE'),
  },
  weight: {
    type: DataTypes.FLOAT,
  },
}, {
  tableName: 'animals',
  timestamps: true,
});

// Relationships
User.hasMany(Animal, { foreignKey: 'owner_id', as: 'animals' });
Animal.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

module.exports = { Animal };

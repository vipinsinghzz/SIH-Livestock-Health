const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { Animal } = require('../animals/models');

const Prediction = sequelize.define('Prediction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  risk_level: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false,
  },
  possible_conditions: {
    type: DataTypes.JSON, // Array of { name, confidence }
  },
  reasons: {
    type: DataTypes.JSON, // Array of text reasons
  },
  model_version: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  requires_veterinary_review: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  tableName: 'predictions',
  timestamps: true,
});

Animal.hasMany(Prediction, { foreignKey: 'animal_id' });
Prediction.belongsTo(Animal, { foreignKey: 'animal_id' });

module.exports = { Prediction };

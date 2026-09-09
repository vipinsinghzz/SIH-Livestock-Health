const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { Animal } = require('../animals/models');

const VeterinaryCase = sequelize.define('VeterinaryCase', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'REVIEWED', 'CLOSED'),
    defaultValue: 'OPEN',
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    defaultValue: 'MEDIUM',
  },
  vet_notes: {
    type: DataTypes.TEXT,
  },
  next_action: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'veterinary_cases',
  timestamps: true,
});

Animal.hasMany(VeterinaryCase, { foreignKey: 'animal_id' });
VeterinaryCase.belongsTo(Animal, { foreignKey: 'animal_id' });

module.exports = { VeterinaryCase };

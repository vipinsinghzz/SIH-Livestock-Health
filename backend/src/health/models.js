const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { Animal } = require('../animals/models');

const HealthRecord = sequelize.define('HealthRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  symptoms: {
    type: DataTypes.JSON, // Array of symptoms
  },
  notes: {
    type: DataTypes.TEXT,
  },
  temperature: {
    type: DataTypes.FLOAT,
  },
  image_url: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.ENUM('SYMPTOM_LOG', 'VACCINATION', 'VET_VISIT'),
    defaultValue: 'SYMPTOM_LOG',
  },
}, {
  tableName: 'health_records',
  timestamps: true,
});

Animal.hasMany(HealthRecord, { foreignKey: 'animal_id' });
HealthRecord.belongsTo(Animal, { foreignKey: 'animal_id' });

module.exports = { HealthRecord };

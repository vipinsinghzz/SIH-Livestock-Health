const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const { Animal } = require('../animals/models');

const Vaccination = sequelize.define('Vaccination', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vaccine_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  administered_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  next_due_date: {
    type: DataTypes.DATE,
  },
  administered_by: {
    type: DataTypes.STRING,
  },
  batch_number: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'vaccinations',
  timestamps: true,
});

Animal.hasMany(Vaccination, { foreignKey: 'animal_id' });
Vaccination.belongsTo(Animal, { foreignKey: 'animal_id' });

module.exports = { Vaccination };

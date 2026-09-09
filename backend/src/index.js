require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./db');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // In production, use migrations instead of sync
    await sequelize.sync({ alter: true }); 

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();

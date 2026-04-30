require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false, // Defina como console.log para ver as queries SQL
    define: {
      timestamps: true, // Cria createdAt e updatedAt automaticamente
      underscored: false, // Mantém camelCase (userId) em vez de snake_case (user_id)
    },
  }
);

module.exports = sequelize;
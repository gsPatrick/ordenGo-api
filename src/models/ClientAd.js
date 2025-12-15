const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClientAd = sequelize.define('ClientAd', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
});

module.exports = ClientAd;

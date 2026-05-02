const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketMessage = sequelize.define('TicketMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  isAdminReply: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = TicketMessage;

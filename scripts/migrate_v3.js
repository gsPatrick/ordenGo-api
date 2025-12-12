const sequelize = require('../src/config/database');
const { RestaurantDocument } = require('../src/models');

async function migrate() {
    try {
        console.log('Starting migration v3...');
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync RestaurantDocument table
        await RestaurantDocument.sync({ alter: true });
        console.log('RestaurantDocument table synced.');

        console.log('Migration v3 completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration v3 failed:', error);
        process.exit(1);
    }
}

migrate();

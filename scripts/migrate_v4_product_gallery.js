const { Sequelize } = require('sequelize');
const sequelize = require('../src/config/database');

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('Products');

        if (!tableInfo.gallery) {
            console.log('Adding "gallery" column to Products...');
            await queryInterface.addColumn('Products', 'gallery', {
                type: Sequelize.JSONB, // Armazena array de strings: ["url1", "url2"]
                allowNull: true,
                defaultValue: []
            });
            console.log('Column "gallery" added successfully.');
        } else {
            console.log('Column "gallery" already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
};

migrate();

const { sequelize, TableSession } = require('../src/models');

async function migrate() {
    try {
        console.log('🚀 Starting migration...');

        // 1. Add 'order' column to Categories
        try {
            // Check if column exists first to avoid error or just catch it
            await sequelize.query(`ALTER TABLE "Categories" ADD COLUMN "order" INTEGER DEFAULT 0;`);
            console.log('✅ Added "order" column to Categories.');
        } catch (error) {
            // Postgres error 42701: duplicate_column
            if (error.original && error.original.code === '42701') {
                console.log('ℹ️ "order" column already exists in Categories.');
            } else {
                console.error('❌ Error adding "order" column to Categories:', error.message);
            }
        }

        // 2. Add 'order' column to Products
        try {
            await sequelize.query(`ALTER TABLE "Products" ADD COLUMN "order" INTEGER DEFAULT 0;`);
            console.log('✅ Added "order" column to Products.');
        } catch (error) {
            if (error.original && error.original.code === '42701') {
                console.log('ℹ️ "order" column already exists in Products.');
            } else {
                console.error('❌ Error adding "order" column to Products:', error.message);
            }
        }

        // 3. Create TableSessions table
        // TableSession.sync() creates the table if it doesn't exist (and does nothing if it does, unless alter/force is passed)
        // This is safe for existing databases as long as we don't pass force: true
        await TableSession.sync();
        console.log('✅ Synced TableSession table.');

        console.log('✨ Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();

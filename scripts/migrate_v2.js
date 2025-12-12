const { sequelize, TableSession } = require('../src/models');

async function migrate() {
    try {
        console.log('🚀 Starting migration...');

        // 1. Add 'order' column to Categories
        try {
            await sequelize.query(`ALTER TABLE "Categories" ADD COLUMN "order" INTEGER DEFAULT 0;`);
            console.log('✅ Added "order" column to Categories.');
        } catch (error) {
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

        // 3. Add 'accessCode' column to Restaurants
        try {
            await sequelize.query(`ALTER TABLE "Restaurants" ADD COLUMN "accessCode" VARCHAR(10);`);
            console.log('✅ Added "accessCode" column to Restaurants.');
        } catch (error) {
            if (error.original && error.original.code === '42701') {
                console.log('ℹ️ "accessCode" column already exists in Restaurants.');
            } else {
                console.error('❌ Error adding "accessCode" column to Restaurants:', error.message);
            }
        }

        // 4. Add UNIQUE constraint to accessCode
        try {
            await sequelize.query(`ALTER TABLE "Restaurants" ADD CONSTRAINT "Restaurants_accessCode_key" UNIQUE ("accessCode");`);
            console.log('✅ Added UNIQUE constraint to accessCode.');
        } catch (error) {
            if (error.original && error.original.code === '42710') { // duplicate_object (constraint)
                console.log('ℹ️ UNIQUE constraint already exists on accessCode.');
            } else {
                console.error('❌ Error adding UNIQUE constraint to accessCode:', error.message);
            }
        }

        // 5. Create TableSessions table
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

import { migrateDb, closeDb } from './database.js';

migrateDb();
closeDb();
console.log('Done.');

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meditactive',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  debug: process.env.NODE_ENV === 'development',
  timezone: '+00:00',
  connectTimeout: 10000,
  multipleStatements: false
};

console.log('Database connection config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? '***' : '(no password)'
});

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  let connection;
  try {
    console.log('Attempting to connect to MySQL server...');
    console.log('Connection details:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      connectTimeout: dbConfig.connectTimeout
    });
    
    // Test basic connection first
    try {
      connection = await pool.getConnection();
      console.log('✅ Successfully connected to MySQL server');
    } catch (connError) {
      console.error('❌ Failed to connect to MySQL server:', {
        code: connError.code,
        errno: connError.errno,
        sqlState: connError.sqlState,
        message: connError.message
      });
      
      // Provide more helpful error messages for common connection issues
      if (connError.code === 'ECONNREFUSED') {
        console.error('\n🔴 MySQL server is not running or not accessible at the specified host/port.');
        console.error('   Please check if MySQL server is running and accessible.');
      } else if (connError.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('\n🔴 Access denied for the specified MySQL user.');
        console.error('   Please verify the username and password in your .env file.');
      } else if (connError.code === 'ER_BAD_DB_ERROR') {
        console.error(`\n🔴 Database '${dbConfig.database}' does not exist.`);
        console.error('   Please create the database or check the database name in your .env file.');
      }
      
      process.exit(1);
    }
    
    // Check if the database exists
    try {
      const [dbs] = await connection.query('SHOW DATABASES LIKE ?', [process.env.DB_NAME || 'MeditActive']);
      if (dbs.length === 0) {
        console.error(`\n🔴 Database '${process.env.DB_NAME || 'MeditActive'}' does not exist`);
        console.error('   Please create the database using: CREATE DATABASE ' + (process.env.DB_NAME || 'MeditActive') + ';');
        process.exit(1);
      }
      console.log(`✅ Database '${process.env.DB_NAME || 'MeditActive'}' exists`);
      
      // Switch to the database
      await connection.query(`USE ${process.env.DB_NAME || 'MeditActive'}`);
      
      // Check if the users table exists
      const [tables] = await connection.query('SHOW TABLES LIKE ?', ['users']);
      if (tables.length === 0) {
        console.error("\n🔴 The 'users' table does not exist in the database");
        console.error('   Please run the database migrations to create the required tables.');
        process.exit(1);
      }
      console.log("✅ 'users' table exists");
      
      // Check the structure of the users table
      const [columns] = await connection.query('DESCRIBE users');
      console.log('\nUsers table structure:');
      console.table(columns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default,
        Extra: col.Extra
      })));
      
      // Check if there are any users in the table
      const [[{ user_count }]] = await connection.query('SELECT COUNT(*) as user_count FROM users');;
      console.log(`\nNumber of users in the database: ${user_count}`);
      
      console.log('\n✅ Database and table verification successful');
      
    } catch (dbError) {
      console.error('\n❌ Database verification failed:', {
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState,
        message: dbError.message,
        sql: dbError.sql
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('Database connection error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

export { pool, testConnection };

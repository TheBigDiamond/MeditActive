import User from './models/user.simple.js';

async function testFindAll() {
  try {
    console.log('Testing User.findAll()...');
    const result = await User.findAll({ limit: 5, offset: 0 });
    console.log('✅ Success! Found users:', result);
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
  } finally {
    // Ensure the process exits
    process.exit(0);
  }
}

testFindAll();

const { sequelize, testConnection } = require('./database');
const User = require('../models/User');

// Khởi tạo database và sync models
const initDatabase = async () => {
  try {
    console.log('🔄 Đang khởi tạo database...');
    
    // Test connection
    await testConnection();
    
    // Sync models (tạo bảng nếu chưa có)
    await sequelize.sync({ force: false }); // force: true sẽ xóa và tạo lại bảng
    console.log('✅ Sync models thành công!');
    
    // Seed dữ liệu mẫu
    await seedData();
    
    console.log('🎉 Khởi tạo database hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi khởi tạo database:', error);
    throw error;
  }
};

// Seed dữ liệu mẫu
const seedData = async () => {
  try {
    // Kiểm tra xem đã có dữ liệu chưa
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('📝 Đang tạo dữ liệu mẫu...');
      
      const sampleUsers = [
        {
          name: 'Nguyễn Văn A',
          email: 'a@example.com',
          age: 25
        },
        {
          name: 'Trần Thị B',
          email: 'b@example.com',
          age: 30
        },
        {
          name: 'Lê Văn C',
          email: 'c@example.com',
          age: 28
        }
      ];
      
      await User.bulkCreate(sampleUsers);
      console.log('✅ Tạo dữ liệu mẫu thành công!');
    } else {
      console.log(`ℹ️  Database đã có ${userCount} users`);
    }
  } catch (error) {
    console.error('❌ Lỗi seed dữ liệu:', error);
  }
};

// Hàm reset database (xóa và tạo lại)
const resetDatabase = async () => {
  try {
    console.log('🔄 Đang reset database...');
    await sequelize.sync({ force: true });
    await seedData();
    console.log('✅ Reset database thành công!');
  } catch (error) {
    console.error('❌ Lỗi reset database:', error);
    throw error;
  }
};

module.exports = {
  initDatabase,
  resetDatabase,
  seedData
}; 
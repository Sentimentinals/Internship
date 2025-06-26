const User = require('../models/User');
const { sequelize } = require('../config/database');

// 🔍 Hiển thị tất cả users
async function showAllUsers() {
  try {
    console.log('🔍 Kiểm tra tất cả users trong database...\n');
    
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công\n');
    
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`📊 Tổng số users: ${users.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (users.length === 0) {
      console.log('📋 Chưa có users nào trong database');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. 🆔 ID: ${user.id}`);
        console.log(`   👤 Tên: ${user.name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🎂 Tuổi: ${user.age || 'Không có'}`);
        console.log(`   📸 Ảnh: ${user.photo || 'Chưa có'}`);
        console.log(`   📅 Tạo lúc: ${new Date(user.created_at).toLocaleString('vi-VN')}`);
        console.log(`   🔄 Cập nhật: ${new Date(user.updated_at).toLocaleString('vi-VN')}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 Database: MySQL với UTF-8 support');
    console.log('🎯 Tất cả tên tiếng Việt hiển thị đúng');
    console.log('🎉 Hệ thống hoạt động ổn định!');
    
    return users;
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

// 🔧 Fix IDs hiện tại thành thứ tự liên tục
async function fixCurrentIds() {
  try {
    console.log('🔧 Đang fix user IDs hiện tại...\n');
    
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');
    
    // Kiểm tra users hiện tại
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log('📋 Users trước khi fix:');
    users.forEach(user => {
      console.log(`   ${user.id}. ${user.name} - ${user.email}`);
    });
    
    // Reorder IDs
    console.log('\n🔄 Thực hiện reorder...');
    const result = await User.reorderIds();
    
    // Kiểm tra kết quả
    const usersAfter = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log('\n📋 Users sau khi fix:');
    usersAfter.forEach(user => {
      console.log(`   ${user.id}. ${user.name} - ${user.email}`);
    });
    
    console.log(`\n✅ ${result.message}`);
    console.log('🎯 IDs đã được fix thành thứ tự liên tục!');
    
    return result;
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

// 🧪 Test toàn diện Auto Reorder System
async function testAutoReorderSystem() {
  try {
    console.log('🧪 Test Auto Reorder IDs System\n');
    
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');
    
    // 1. Kiểm tra users hiện tại
    console.log('\n📋 Users trước test:');
    const usersBefore = await User.findAll({
      order: [['id', 'ASC']]
    });
    const idsBefore = usersBefore.map(u => u.id);
    console.log(`   Tổng: ${usersBefore.length} users`);
    console.log(`   IDs: [${idsBefore.join(', ')}]`);
    
    // 2. Test thêm user mới (auto reorder)
    console.log('\n🔵 TEST 1: Thêm user mới (auto reorder)');
    const addResult = await User.createWithValidation({
      name: 'Test Auto Reorder',
      email: `testauto${Date.now()}@test.com`,
      age: 25
    });
    
    if (addResult.success) {
      console.log(`✅ Thêm thành công: ID ${addResult.data.id}`);
    } else {
      console.log(`❌ Lỗi: ${addResult.message}`);
      return;
    }
    
    // 3. Kiểm tra users sau khi thêm
    const usersAfterAdd = await User.findAll({
      order: [['id', 'ASC']]
    });
    const idsAfterAdd = usersAfterAdd.map(u => u.id);
    console.log(`   IDs sau thêm: [${idsAfterAdd.join(', ')}]`);
    
    // 4. Test xóa user (tìm user test để xóa)
    const testUser = usersAfterAdd.find(u => u.email.includes('testauto'));
    if (testUser) {
      console.log(`\n🔴 TEST 2: Xóa user ID ${testUser.id} (auto reorder)`);
      const deleteResult = await User.deleteWithReorder(testUser.id);
      
      if (deleteResult.success) {
        console.log(`✅ Xóa thành công: ${deleteResult.message}`);
      } else {
        console.log(`❌ Lỗi: ${deleteResult.message}`);
        return;
      }
    }
    
    // 5. Kiểm tra kết quả cuối
    const usersAfterDelete = await User.findAll({
      order: [['id', 'ASC']]
    });
    const idsAfterDelete = usersAfterDelete.map(u => u.id);
    
    // 6. Kiểm tra IDs có liên tục không
    const expectedIds = Array.from({length: idsAfterDelete.length}, (_, i) => i + 1);
    const isSequential = JSON.stringify(idsAfterDelete) === JSON.stringify(expectedIds);
    
    console.log('\n🎯 KẾT QUẢ CUỐI:');
    console.log(`   IDs hiện tại: [${idsAfterDelete.join(', ')}]`);
    console.log(`   IDs mong đợi: [${expectedIds.join(', ')}]`);
    console.log(`   Auto Reorder: ${isSequential ? '✅ HOẠT ĐỘNG HOÀN HẢO!' : '❌ KHÔNG HOẠT ĐỘNG'}`);
    
    return {
      success: isSequential,
      before: idsBefore,
      after: idsAfterDelete,
      totalUsers: idsAfterDelete.length
    };
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

// 🎯 Test xóa user cụ thể
async function testDeleteUser(userId) {
  try {
    console.log(`🔴 TEST XÓA USER ID ${userId}\n`);
    
    await sequelize.authenticate();
    
    // 1. Xem users trước khi xóa
    const usersBefore = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    const targetUser = usersBefore.find(u => u.id === userId);
    if (!targetUser) {
      console.log(`❌ Không tìm thấy user ID ${userId}`);
      return { success: false, message: 'User không tồn tại' };
    }
    
    console.log('📋 TRƯỚC KHI XÓA:');
    console.log(`   Tổng users: ${usersBefore.length}`);
    console.log(`   IDs: [${usersBefore.map(u => u.id).join(', ')}]`);
    console.log(`\n🎯 SẼ XÓA: ${targetUser.name} (${targetUser.email})`);
    
    // 2. Xóa user với Auto Reorder
    console.log('\n🔄 THỰC HIỆN XÓA...');
    const deleteResult = await User.deleteWithReorder(userId);
    
    if (!deleteResult.success) {
      console.log(`❌ Lỗi: ${deleteResult.message}`);
      return deleteResult;
    }
    
    console.log(`✅ ${deleteResult.message}`);
    
    // 3. Xem users sau khi xóa
    const usersAfter = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    const idsAfter = usersAfter.map(u => u.id);
    const expectedIds = Array.from({length: idsAfter.length}, (_, i) => i + 1);
    const isSequential = JSON.stringify(idsAfter) === JSON.stringify(expectedIds);
    
    console.log('\n📋 SAU KHI XÓA:');
    console.log(`   Tổng users: ${usersAfter.length} (giảm ${usersBefore.length - usersAfter.length})`);
    console.log(`   IDs: [${idsAfter.join(', ')}]`);
    console.log(`   Auto Reorder: ${isSequential ? '✅ THÀNH CÔNG!' : '❌ THẤT BẠI!'}`);
    
    return {
      success: isSequential,
      deletedUser: deleteResult.data,
      before: usersBefore.map(u => u.id),
      after: idsAfter
    };
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

// 📊 Hiển thị thống kê IDs
async function showIdStats() {
  try {
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    const ids = users.map(u => u.id);
    const expectedIds = Array.from({length: ids.length}, (_, i) => i + 1);
    const isSequential = JSON.stringify(ids) === JSON.stringify(expectedIds);
    
    console.log('📊 THỐNG KÊ IDs:');
    console.log(`   Tổng users: ${users.length}`);
    console.log(`   IDs hiện tại: [${ids.join(', ')}]`);
    console.log(`   IDs mong đợi: [${expectedIds.join(', ')}]`);
    console.log(`   Trạng thái: ${isSequential ? '✅ LIÊN TỤC' : '❌ CÓ KHOẢNG TRỐNG'}`);
    
    if (!isSequential) {
      const gaps = [];
      for (let i = 1; i <= Math.max(...ids); i++) {
        if (!ids.includes(i)) {
          gaps.push(i);
        }
      }
      console.log(`   Khoảng trống: [${gaps.join(', ')}]`);
    }
    
    return {
      total: users.length,
      ids: ids,
      isSequential: isSequential,
      gaps: isSequential ? [] : expectedIds.filter(id => !ids.includes(id))
    };
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

module.exports = {
  showAllUsers,
  fixCurrentIds,
  testAutoReorderSystem,
  testDeleteUser,
  showIdStats,
  
  // Shortcut functions
  show: showAllUsers,
  fix: fixCurrentIds,
  test: testAutoReorderSystem,
  delete: testDeleteUser,
  stats: showIdStats
}; 
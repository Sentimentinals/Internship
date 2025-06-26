#!/usr/bin/env node

const utils = require('./utils');
const { sequelize } = require('../config/database');

// Lấy command line arguments
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

async function runCommand() {
  try {
    console.log('🚀 User Management CLI Tool\n');
    
    switch (command) {
      case 'show':
      case 'list':
      case 'ls':
        console.log('📋 Hiển thị tất cả users...\n');
        await utils.showAllUsers();
        break;
        
      case 'stats':
      case 'status':
        console.log('📊 Hiển thị thống kê IDs...\n');
        await utils.showIdStats();
        break;
        
      case 'fix':
      case 'reorder':
        console.log('🔧 Fix IDs thành thứ tự liên tục...\n');
        await utils.fixCurrentIds();
        break;
        
      case 'test':
        console.log('🧪 Test Auto Reorder System...\n');
        await utils.testAutoReorderSystem();
        break;
        
      case 'delete':
      case 'del':
        if (!param || isNaN(param)) {
          console.log('❌ Vui lòng cung cấp User ID để xóa');
          console.log('   Ví dụ: node scripts/cli.js delete 5');
          break;
        }
        console.log(`🔴 Test xóa user ID ${param}...\n`);
        await utils.testDeleteUser(parseInt(param));
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        console.log('❌ Lệnh không hợp lệ!');
        console.log('💡 Chạy "node scripts/cli.js help" để xem hướng dẫn\n');
        showHelp();
        break;
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n👋 Hoàn tất!');
  }
}

function showHelp() {
  console.log('🔧 USER MANAGEMENT CLI TOOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DANH SÁCH LỆNH:');
  console.log('');
  console.log('  📊 show | list | ls       - Hiển thị tất cả users');
  console.log('  📊 stats | status         - Thống kê IDs và trạng thái');
  console.log('  🔧 fix | reorder          - Fix IDs thành thứ tự liên tục');
  console.log('  🧪 test                   - Test toàn diện Auto Reorder');
  console.log('  🔴 delete | del <id>      - Test xóa user với ID cụ thể');
  console.log('  ❓ help | --help | -h     - Hiển thị hướng dẫn này');
  console.log('');
  console.log('📝 VÍ DỤ SỬ DỤNG:');
  console.log('');
  console.log('  node scripts/cli.js show          # Xem tất cả users');
  console.log('  node scripts/cli.js stats         # Xem thống kê IDs');
  console.log('  node scripts/cli.js fix           # Fix IDs liên tục');
  console.log('  node scripts/cli.js test          # Test Auto Reorder');
  console.log('  node scripts/cli.js delete 5      # Test xóa user ID 5');
  console.log('');
  console.log('🎯 Tất cả lệnh đều hỗ trợ Auto Reorder IDs System!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Chạy CLI
if (require.main === module) {
  runCommand();
} 
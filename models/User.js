const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Định nghĩa model User với UTF-8 support
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: {
        msg: 'Tên không được để trống'
      },
      len: {
        args: [2, 100],
        msg: 'Tên phải từ 2-100 ký tự'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'Email đã tồn tại'
    },
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      isEmail: {
        msg: 'Email không hợp lệ'
      },
      notEmpty: {
        msg: 'Email không được để trống'
      }
    }
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: {
        args: [1],
        msg: 'Tuổi phải lớn hơn 0'
      },
      max: {
        args: [150],
        msg: 'Tuổi không được quá 150'
      }
    }
  },
  photo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'URL ảnh đại diện (sẽ dùng cho upload S3)'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  indexes: [
    {
      unique: true,
      fields: ['email']
    }
  ]
});

// Instance methods
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  // Ẩn các field nhạy cảm nếu cần
  return values;
};

// Class method: Reorder IDs để đảm bảo thứ tự liên tục
User.reorderIds = async function() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Đang reorder user IDs...');
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    
    // Lấy tất cả users theo thứ tự created_at
    const users = await this.findAll({
      order: [['created_at', 'ASC']],
      transaction
    });
    
    if (users.length === 0) {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      await transaction.commit();
      return { success: true, message: 'Không có users để reorder' };
    }
    
    // Truncate và recreate table với data mới
    const userData = users.map(user => ({
      name: user.name,
      email: user.email,
      age: user.age,
      photo: user.photo,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
    
    // Xóa tất cả users
    await sequelize.query('DELETE FROM users', { transaction });
    
    // Reset AUTO_INCREMENT về 1
    await sequelize.query('ALTER TABLE users AUTO_INCREMENT = 1', { transaction });
    
    // Insert lại data với IDs mới (1, 2, 3, ...)
    for (let i = 0; i < userData.length; i++) {
      await sequelize.query(`
        INSERT INTO users (name, email, age, photo, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          userData[i].name,
          userData[i].email, 
          userData[i].age,
          userData[i].photo,
          userData[i].created_at,
          userData[i].updated_at
        ],
        transaction
      });
    }
    
    // Enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    
    await transaction.commit();
    
    console.log(`✅ Đã reorder ${userData.length} users: IDs từ 1 đến ${userData.length}`);
    return { 
      success: true, 
      message: `Reorder thành công ${userData.length} users`,
      newCount: userData.length 
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Lỗi reorder IDs:', error.message);
    throw error;
  }
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({
    where: { email }
  });
};

User.createWithValidation = async function(userData) {
  try {
    const user = await this.create(userData);
    
    // Sau khi tạo user mới, reorder IDs
    await this.reorderIds();
    
    // Lấy lại user với ID mới
    const updatedUser = await this.findOne({
      where: { email: userData.email }
    });
    
    return { success: true, data: updatedUser };
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return {
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors.map(e => e.message)
      };
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return {
        success: false,
        message: 'Email đã tồn tại'
      };
    }
    throw error;
  }
};

User.deleteWithReorder = async function(userId) {
  try {
    const user = await this.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'Không tìm thấy user để xóa'
      };
    }
    
    // Lưu thông tin user trước khi xóa
    const userData = user.toJSON();
    
    // Xóa user
    await user.destroy();
    
    // Reorder IDs sau khi xóa
    await this.reorderIds();
    
    return {
      success: true,
      message: 'Xóa user và reorder IDs thành công',
      data: userData
    };
    
  } catch (error) {
    throw error;
  }
};

module.exports = User; 
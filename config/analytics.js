const fs = require('fs');
const path = require('path');

// Analytics data structure
const analytics = {
    uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        byMode: { local: 0, s3: 0 },
        byDay: {},
        totalSize: 0
    },
    storage: {
        localFiles: 0,
        localSize: 0,
        s3Files: 0,
        s3Size: 0
    },
    performance: {
        averageUploadTime: 0,
        slowestUpload: 0,
        fastestUpload: Infinity
    },
    users: {
        withPhotos: 0,
        withoutPhotos: 0,
        recentUploads: []
    }
};

/**
 * Track upload event
 * @param {Object} uploadData - Upload data
 */
function trackUpload(uploadData) {
    const { success, mode, size, duration, userId, error } = uploadData;
    const today = new Date().toISOString().split('T')[0];

    // Update totals
    analytics.uploads.total++;
    
    if (success) {
        analytics.uploads.successful++;
        analytics.uploads.byMode[mode]++;
        analytics.uploads.totalSize += size || 0;
        
        // Track performance
        if (duration) {
            const currentAvg = analytics.performance.averageUploadTime;
            const totalSuccessful = analytics.uploads.successful;
            analytics.performance.averageUploadTime = 
                (currentAvg * (totalSuccessful - 1) + duration) / totalSuccessful;
            
            if (duration > analytics.performance.slowestUpload) {
                analytics.performance.slowestUpload = duration;
            }
            if (duration < analytics.performance.fastestUpload) {
                analytics.performance.fastestUpload = duration;
            }
        }
        
        // Track recent uploads
        analytics.users.recentUploads.unshift({
            userId,
            timestamp: new Date(),
            mode,
            size
        });
        
        // Keep only last 10 uploads
        if (analytics.users.recentUploads.length > 10) {
            analytics.users.recentUploads = analytics.users.recentUploads.slice(0, 10);
        }
        
    } else {
        analytics.uploads.failed++;
        console.log(`📊 Upload failed: ${error || 'Unknown error'}`);
    }

    // Track by day
    if (!analytics.uploads.byDay[today]) {
        analytics.uploads.byDay[today] = { total: 0, successful: 0, failed: 0 };
    }
    analytics.uploads.byDay[today].total++;
    if (success) {
        analytics.uploads.byDay[today].successful++;
    } else {
        analytics.uploads.byDay[today].failed++;
    }

    // Auto-save analytics
    saveAnalytics();
}

/**
 * Update storage statistics
 * @param {Array} users - Array of users from database
 */
async function updateStorageStats(users) {
    let localFiles = 0, localSize = 0, s3Files = 0, s3Size = 0;
    let usersWithPhotos = 0;

    for (const user of users) {
        if (user.photo) {
            usersWithPhotos++;
            
            if (user.photo.includes('amazonaws.com')) {
                s3Files++;
                // S3 size would need to be tracked separately or estimated
            } else if (user.photo.startsWith('/uploads/')) {
                localFiles++;
                try {
                    const filePath = path.join(process.cwd(), user.photo);
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        localSize += stats.size;
                    }
                } catch (error) {
                    console.error('Error getting file size:', error);
                }
            }
        }
    }

    analytics.storage = {
        localFiles,
        localSize,
        s3Files,
        s3Size: 0 // Would need S3 API to get actual sizes
    };

    analytics.users.withPhotos = usersWithPhotos;
    analytics.users.withoutPhotos = users.length - usersWithPhotos;
}

/**
 * Get analytics summary
 * @returns {Object} - Analytics data
 */
function getAnalytics() {
    const summary = {
        ...analytics,
        computed: {
            successRate: analytics.uploads.total > 0 ? 
                (analytics.uploads.successful / analytics.uploads.total * 100).toFixed(2) + '%' : '0%',
            averageSizePerUpload: analytics.uploads.successful > 0 ? 
                Math.round(analytics.uploads.totalSize / analytics.uploads.successful / 1024) + ' KB' : '0 KB',
            totalSizeFormatted: formatBytes(analytics.uploads.totalSize),
            localStorageFormatted: formatBytes(analytics.storage.localSize),
            fastestUploadFormatted: analytics.performance.fastestUpload !== Infinity ? 
                analytics.performance.fastestUpload + 'ms' : 'N/A',
            slowestUploadFormatted: analytics.performance.slowestUpload + 'ms',
            averageUploadFormatted: Math.round(analytics.performance.averageUploadTime) + 'ms'
        }
    };

    return summary;
}

/**
 * Get daily upload statistics for last N days
 * @param {number} days - Number of days to get stats for
 * @returns {Array} - Daily stats
 */
function getDailyStats(days = 7) {
    const dailyStats = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = analytics.uploads.byDay[dateStr] || { total: 0, successful: 0, failed: 0 };
        
        dailyStats.push({
            date: dateStr,
            day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
            ...dayData
        });
    }
    
    return dailyStats;
}

/**
 * Reset analytics data
 */
function resetAnalytics() {
    Object.keys(analytics.uploads).forEach(key => {
        if (typeof analytics.uploads[key] === 'number') {
            analytics.uploads[key] = 0;
        } else if (typeof analytics.uploads[key] === 'object') {
            if (key === 'byMode') {
                analytics.uploads[key] = { local: 0, s3: 0 };
            } else if (key === 'byDay') {
                analytics.uploads[key] = {};
            }
        }
    });
    
    analytics.performance = {
        averageUploadTime: 0,
        slowestUpload: 0,
        fastestUpload: Infinity
    };
    
    analytics.users.recentUploads = [];
    
    console.log('📊 Analytics data has been reset');
    saveAnalytics();
}

/**
 * Save analytics to file
 */
function saveAnalytics() {
    try {
        const analyticsFile = path.join(process.cwd(), 'analytics.json');
        fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2));
    } catch (error) {
        console.error('Error saving analytics:', error);
    }
}

/**
 * Load analytics from file
 */
function loadAnalytics() {
    try {
        const analyticsFile = path.join(process.cwd(), 'analytics.json');
        if (fs.existsSync(analyticsFile)) {
            const data = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
            Object.assign(analytics, data);
            console.log('📊 Analytics data loaded successfully');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate analytics report
 * @returns {string} - Formatted report
 */
function generateReport() {
    const stats = getAnalytics();
    const dailyStats = getDailyStats(7);
    
    let report = `
📊 ANALYTICS REPORT - ${new Date().toLocaleString('vi-VN')}
${'='.repeat(60)}

📈 UPLOAD STATISTICS:
   Total Uploads: ${stats.uploads.total}
   Successful: ${stats.uploads.successful}
   Failed: ${stats.uploads.failed}
   Success Rate: ${stats.computed.successRate}

🗄️ STORAGE BREAKDOWN:
   Local Files: ${stats.storage.localFiles} (${stats.computed.localStorageFormatted})
   S3 Files: ${stats.storage.s3Files}
   Total Size Uploaded: ${stats.computed.totalSizeFormatted}

⚡ PERFORMANCE:
   Average Upload Time: ${stats.computed.averageUploadFormatted}
   Fastest Upload: ${stats.computed.fastestUploadFormatted}
   Slowest Upload: ${stats.computed.slowestUploadFormatted}

👥 USER STATISTICS:
   Users with Photos: ${stats.users.withPhotos}
   Users without Photos: ${stats.users.withoutPhotos}

📅 DAILY BREAKDOWN (Last 7 days):
${dailyStats.map(day => 
    `   ${day.date} (${day.day}): ${day.successful}/${day.total} uploads`
).join('\n')}

🕒 RECENT UPLOADS:
${stats.users.recentUploads.slice(0, 5).map(upload => 
    `   User ${upload.userId} - ${upload.mode} - ${formatBytes(upload.size || 0)} - ${upload.timestamp.toLocaleString('vi-VN')}`
).join('\n')}
`;

    return report;
}

// Load analytics on module initialization
loadAnalytics();

module.exports = {
    trackUpload,
    updateStorageStats,
    getAnalytics,
    getDailyStats,
    resetAnalytics,
    generateReport,
    formatBytes
}; 
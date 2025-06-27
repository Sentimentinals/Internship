const rateLimit = require('express-rate-limit');
const fileType = require('file-type');
const crypto = require('crypto');

// Rate limiting cho upload endpoints
const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 uploads per windowMs
    message: {
        success: false,
        message: 'Quá nhiều upload requests! Thử lại sau 15 phút.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting cho API chung
const apiRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Quá nhiều API requests! Thử lại sau 1 phút.',
        retryAfter: '1 minute'
    }
});

/**
 * Validate file type bằng magic numbers (không tin tưởng extension)
 * @param {Buffer} buffer - File buffer
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Object} - Validation result
 */
async function validateFileType(buffer, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
    try {
        const type = await fileType.fromBuffer(buffer);
        
        if (!type) {
            return {
                valid: false,
                error: 'Không thể xác định loại file'
            };
        }

        if (!allowedTypes.includes(type.mime)) {
            return {
                valid: false,
                error: `Loại file không được phép. Chỉ chấp nhận: ${allowedTypes.join(', ')}`
            };
        }

        return {
            valid: true,
            detectedType: type.mime,
            extension: type.ext
        };

    } catch (error) {
        return {
            valid: false,
            error: 'Lỗi khi kiểm tra loại file'
        };
    }
}

/**
 * Scan file for malicious content (basic)
 * @param {Buffer} buffer - File buffer
 * @returns {Object} - Scan result
 */
function basicMalwareScan(buffer) {
    // Kiểm tra một số signature cơ bản
    const suspiciousPatterns = [
        /<?php/gi,
        /<script/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
    ];

    const fileContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(fileContent)) {
            return {
                safe: false,
                threat: 'Phát hiện code độc hại trong file'
            };
        }
    }

    return {
        safe: true,
        threat: null
    };
}

/**
 * Generate secure filename
 * @param {string} originalName - Original filename
 * @param {string} userId - User ID
 * @returns {string} - Secure filename
 */
function generateSecureFilename(originalName, userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const ext = require('path').extname(originalName).toLowerCase();
    
    // Remove any dangerous characters
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '');
    
    return `user${userId}_${timestamp}_${random}${ext}`;
}

/**
 * Validate upload request
 * @param {Object} req - Express request
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
async function validateUploadRequest(req, file) {
    const errors = [];

    // Validate user ID
    if (!req.params.id || isNaN(parseInt(req.params.id))) {
        errors.push('User ID không hợp lệ');
    }

    // Validate file presence
    if (!file) {
        errors.push('Không có file được upload');
    }

    if (file) {
        // Validate file size
        if (file.size > 10 * 1024 * 1024) { // 10MB
            errors.push('File quá lớn (tối đa 10MB)');
        }

        // Validate file type
        const typeValidation = await validateFileType(file.buffer);
        if (!typeValidation.valid) {
            errors.push(typeValidation.error);
        }

        // Basic malware scan
        const scanResult = basicMalwareScan(file.buffer);
        if (!scanResult.safe) {
            errors.push(scanResult.threat);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * IP whitelist middleware
 * @param {Array} allowedIPs - Array of allowed IP addresses
 * @returns {Function} - Express middleware
 */
function ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // No whitelist configured
        }

        const clientIP = req.ip || req.connection.remoteAddress;
        
        if (allowedIPs.includes(clientIP)) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'IP address không được phép truy cập'
            });
        }
    };
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`📊 ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${ip}`);
    });
    
    next();
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}

module.exports = {
    uploadRateLimit,
    apiRateLimit,
    validateFileType,
    basicMalwareScan,
    generateSecureFilename,
    validateUploadRequest,
    ipWhitelist,
    requestLogger,
    securityHeaders
}; 
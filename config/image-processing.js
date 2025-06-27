const sharp = require('sharp');
const path = require('path');

// Image processing configuration
const IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    medium: { width: 500, height: 500, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 }
};

/**
 * Process and optimize image với multiple sizes
 * @param {Buffer} buffer - Image buffer từ multer
 * @param {string} filename - Original filename
 * @returns {Object} - Processed images data
 */
async function processImage(buffer, filename) {
    try {
        const ext = path.extname(filename).toLowerCase();
        const basename = path.basename(filename, ext);
        
        // Get image metadata
        const metadata = await sharp(buffer).metadata();
        
        const results = {
            original: {
                width: metadata.width,
                height: metadata.height,
                size: buffer.length,
                format: metadata.format
            },
            processed: {}
        };

        // Process each size
        for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
            const processedBuffer = await sharp(buffer)
                .resize(config.width, config.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: config.quality, mozjpeg: true })
                .toBuffer();

            results.processed[sizeName] = {
                buffer: processedBuffer,
                filename: `${basename}_${sizeName}.jpg`,
                width: config.width,
                height: config.height,
                size: processedBuffer.length,
                mimetype: 'image/jpeg'
            };
        }

        return {
            success: true,
            data: results
        };

    } catch (error) {
        console.error('❌ Image processing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Optimize single image without resizing
 * @param {Buffer} buffer - Image buffer
 * @param {number} quality - JPEG quality (1-100)
 * @returns {Buffer} - Optimized buffer
 */
async function optimizeImage(buffer, quality = 85) {
    try {
        return await sharp(buffer)
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
    } catch (error) {
        console.error('❌ Image optimization error:', error);
        return buffer; // Return original if optimization fails
    }
}

/**
 * Generate WebP version for modern browsers
 * @param {Buffer} buffer - Image buffer
 * @param {number} quality - WebP quality (1-100)
 * @returns {Buffer} - WebP buffer
 */
async function generateWebP(buffer, quality = 80) {
    try {
        return await sharp(buffer)
            .webp({ quality })
            .toBuffer();
    } catch (error) {
        console.error('❌ WebP generation error:', error);
        return null;
    }
}

/**
 * Extract and remove EXIF data for privacy
 * @param {Buffer} buffer - Image buffer
 * @returns {Buffer} - Cleaned buffer
 */
async function removeExifData(buffer) {
    try {
        return await sharp(buffer)
            .rotate() // Auto-rotate based on EXIF orientation
            .withMetadata(false) // Remove all metadata
            .toBuffer();
    } catch (error) {
        console.error('❌ EXIF removal error:', error);
        return buffer;
    }
}

/**
 * Validate image dimensions and file size
 * @param {Buffer} buffer - Image buffer
 * @param {Object} constraints - Size constraints
 * @returns {Object} - Validation result
 */
async function validateImage(buffer, constraints = {}) {
    const defaults = {
        maxWidth: 5000,
        maxHeight: 5000,
        maxSize: 10 * 1024 * 1024, // 10MB
        minWidth: 50,
        minHeight: 50
    };
    
    const config = { ...defaults, ...constraints };
    
    try {
        const metadata = await sharp(buffer).metadata();
        const errors = [];

        if (metadata.width > config.maxWidth) {
            errors.push(`Chiều rộng vượt quá ${config.maxWidth}px`);
        }
        if (metadata.height > config.maxHeight) {
            errors.push(`Chiều cao vượt quá ${config.maxHeight}px`);
        }
        if (metadata.width < config.minWidth) {
            errors.push(`Chiều rộng tối thiểu ${config.minWidth}px`);
        }
        if (metadata.height < config.minHeight) {
            errors.push(`Chiều cao tối thiểu ${config.minHeight}px`);
        }
        if (buffer.length > config.maxSize) {
            errors.push(`Kích thước file vượt quá ${(config.maxSize / 1024 / 1024).toFixed(1)}MB`);
        }

        return {
            valid: errors.length === 0,
            errors,
            metadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: buffer.length
            }
        };

    } catch (error) {
        return {
            valid: false,
            errors: ['File không phải là ảnh hợp lệ'],
            metadata: null
        };
    }
}

module.exports = {
    processImage,
    optimizeImage,
    generateWebP,
    removeExifData,
    validateImage,
    IMAGE_SIZES
}; 
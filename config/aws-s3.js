const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load environment variables
require('dotenv').config();

// AWS S3 Configuration
const s3Config = {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

// Create S3 client
const s3Client = new S3Client(s3Config);

// S3 bucket name
const bucketName = process.env.AWS_S3_BUCKET;

// Validate AWS configuration
const validateAWSConfig = () => {
    const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_BUCKET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
    }
    
    return true;
};

// Generate unique filename
const generateFileName = (originalFilename) => {
    const ext = path.extname(originalFilename);
    const uuid = uuidv4();
    return `user-photos/${uuid}${ext}`;
};

// Upload file to S3
const uploadToS3 = async (file, originalFilename = null) => {
    try {
        validateAWSConfig();
        
        const fileName = generateFileName(originalFilename || 'upload.jpg');
        
        const uploadParams = {
            Bucket: bucketName,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read', // Make file publicly accessible
            Metadata: {
                'original-name': originalFilename || 'unknown',
                'upload-timestamp': new Date().toISOString(),
            }
        };
        
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);
        
        // Generate public URL
        const fileUrl = `https://${bucketName}.s3.${s3Config.region}.amazonaws.com/${fileName}`;
        
        return {
            success: true,
            data: {
                key: fileName,
                url: fileUrl,
                bucket: bucketName,
                etag: result.ETag,
                size: file.size,
                mimetype: file.mimetype,
                originalName: originalFilename
            }
        };
        
    } catch (error) {
        console.error('❌ S3 Upload Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Delete file from S3
const deleteFromS3 = async (fileKey) => {
    try {
        validateAWSConfig();
        
        const deleteParams = {
            Bucket: bucketName,
            Key: fileKey,
        };
        
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
        
        return {
            success: true,
            message: `File ${fileKey} deleted successfully`
        };
        
    } catch (error) {
        console.error('❌ S3 Delete Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Generate presigned URL for temporary access
const generatePresignedUrl = async (fileKey, expiresIn = 3600) => {
    try {
        validateAWSConfig();
        
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });
        
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        
        return {
            success: true,
            url: signedUrl
        };
        
    } catch (error) {
        console.error('❌ S3 Presigned URL Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Test S3 connection
const testS3Connection = async () => {
    try {
        validateAWSConfig();
        
        // Try to list objects (just to test connection)
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            MaxKeys: 1
        });
        
        await s3Client.send(command);
        
        return {
            success: true,
            message: 'AWS S3 connection successful',
            bucket: bucketName,
            region: s3Config.region
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'AWS S3 connection failed'
        };
    }
};

module.exports = {
    s3Client,
    bucketName,
    uploadToS3,
    deleteFromS3,
    generatePresignedUrl,
    testS3Connection,
    validateAWSConfig,
    generateFileName
}; 
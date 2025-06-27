# 🚀 AWS S3 SETUP GUIDE - HƯỚNG DẪN TÍCH HỢP AWS S3

## 📋 **TẠI SAO CẦN AWS S3?**

### ✅ **Ưu điểm của S3 so với Local Storage:**
- **Scalability**: Không giới hạn dung lượng
- **Availability**: 99.999999999% (11 9s) durability
- **Global Access**: CDN tích hợp với CloudFront
- **Security**: IAM permissions, encryption
- **Cost Effective**: Pay-as-you-use
- **Production Ready**: Phù hợp cho production deployment

### 📊 **So sánh Local vs S3:**
| Feature | Local Storage | AWS S3 |
|---------|---------------|--------|
| Dung lượng | Giới hạn disk | Unlimited |
| Backup | Manual | Automatic |
| Global Access | Cần CDN riêng | Built-in CDN |
| Cost | Server disk | $0.023/GB/month |
| Scalability | Giới hạn server | Auto-scale |

---

## 🎯 **BƯỚC 1: TẠO AWS ACCOUNT**

### 1.1 Đăng ký AWS Free Tier
- Truy cập: https://aws.amazon.com/free/
- Tạo account với email và credit card
- **Free Tier S3**: 5GB storage, 20,000 GET requests/month

### 1.2 Xác thực account
- Xác thực email và phone
- Hoàn tất billing setup

---

## 🔐 **BƯỚC 2: TẠO IAM USER VÀ CREDENTIALS**

### 2.1 Truy cập IAM Console
1. Login AWS Console
2. Search "IAM" → IAM Dashboard
3. Click "Users" → "Create user"

### 2.2 Tạo User
```
User name: nodejs-s3-user
Access type: ✅ Programmatic access
```

### 2.3 Attach Policy
**Option 1: Quick Setup (Development)**
```
Policy: AmazonS3FullAccess
```

**Option 2: Production Setup (Recommended)**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

### 2.4 Download Credentials
- **Access Key ID**: AKIA...
- **Secret Access Key**: wJalrXUt...
- ⚠️ **LƯU Ý**: Download CSV file và bảo mật tuyệt đối!

---

## 🪣 **BƯỚC 3: TẠO S3 BUCKET**

### 3.1 Truy cập S3 Console
1. AWS Console → Search "S3"
2. Click "Create bucket"

### 3.2 Cấu hình Bucket
```
Bucket name: nodejs-user-photos-[random]
   VD: nodejs-user-photos-12345

Region: Asia Pacific (Singapore) ap-southeast-1
   (Hoặc region gần nhất)

Object Ownership: ACLs enabled
   ✅ Bucket owner preferred

Block Public Access: 
   ❌ Uncheck "Block all public access"
   ✅ I acknowledge...

Bucket Versioning: Disabled (cho demo)
Encryption: Server-side encryption (SSE-S3)
```

### 3.3 Cấu hình CORS
1. Bucket → Permissions → CORS
2. Add CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ]
    }
]
```

---

## ⚙️ **BƯỚC 4: CẤU HÌNH PROJECT**

### 4.1 Cập nhật .env file
```env
# Upload Configuration
UPLOAD_MODE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUt...
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=nodejs-user-photos-12345

# Server Configuration
PORT=3001
NODE_ENV=development

# Upload Configuration
MAX_FILE_SIZE=5242880
```

### 4.2 Restart Server
```bash
# Tắt server cũ
taskkill /F /IM node.exe

# Khởi động lại
npm start
```

---

## 🧪 **BƯỚC 5: TEST S3 INTEGRATION**

### 5.1 Test Upload Info
```bash
curl http://localhost:3001/upload-info
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "mode": "s3",
    "s3Status": {
      "success": true,
      "bucket": "nodejs-user-photos-12345",
      "region": "ap-southeast-1"
    }
  }
}
```

### 5.2 Test Upload
```bash
node test-hybrid-upload.js
```

**Expected Results:**
- ✅ Mode: s3
- ✅ URL: https://nodejs-user-photos-12345.s3.ap-southeast-1.amazonaws.com/user-photos/uuid.png
- ✅ Photo accessible from S3 URL

---

## 🔧 **TROUBLESHOOTING**

### ❌ **Error: Missing AWS credentials**
```
Solution:
1. Check .env file có đúng credentials
2. Restart server sau khi update .env
3. Verify IAM user có permissions
```

### ❌ **Error: Access Denied**
```
Solution:
1. Check IAM policy permissions
2. Verify bucket CORS configuration
3. Ensure bucket allows public read access
```

### ❌ **Error: Bucket not found**
```
Solution:
1. Verify bucket name in .env
2. Check bucket region matches AWS_REGION
3. Ensure bucket exists và accessible
```

### ❌ **Error: File upload but not accessible**
```
Solution:
1. Check bucket ACL settings
2. Verify object ACL: public-read
3. Test direct S3 URL trong browser
```

---

## 📊 **MONITORING VÀ COSTS**

### 💰 **Cost Estimation**
```
Storage: $0.023/GB/month
Requests: $0.0004/1000 PUT requests
Data Transfer: $0.09/GB out to internet

Example (1000 photos, 1MB each):
- Storage: 1GB × $0.023 = $0.023/month
- Uploads: 1000 × $0.0004 = $0.4
- Total: ~$0.42/month
```

### 📈 **CloudWatch Monitoring**
- S3 Console → Metrics → Request metrics
- Monitor: NumberOfObjects, BucketSizeBytes
- Set up alarms cho cost control

---

## 🚀 **PRODUCTION CHECKLIST**

### ✅ **Security**
- [ ] IAM user với minimum permissions
- [ ] Bucket không public write access
- [ ] Environment variables được secure
- [ ] Access logs enabled

### ✅ **Performance**
- [ ] CloudFront CDN setup (optional)
- [ ] Appropriate storage class
- [ ] Lifecycle policies cho old files

### ✅ **Backup**
- [ ] Cross-region replication (optional)
- [ ] Versioning enabled if needed
- [ ] MFA delete protection

---

## 🎯 **NEXT STEPS**

1. **✅ Test S3 integration** với credentials thật
2. **📱 Update frontend** để hiển thị S3 URLs
3. **🔄 Migration script** chuyển local files lên S3
4. **📊 Monitoring setup** cho production
5. **🚀 Deploy** lên cloud platform

---

## 💡 **TIPS VÀ BEST PRACTICES**

### 🎨 **File Organization**
```
Bucket Structure:
/user-photos/
  ├── uuid1.jpg
  ├── uuid2.png
  └── uuid3.webp
  
/thumbnails/        (future feature)
  ├── thumb-uuid1.jpg
  └── thumb-uuid2.jpg
```

### 🔐 **Security Best Practices**
- Sử dụng IAM roles thay vì access keys (khi deploy EC2)
- Rotate access keys định kỳ
- Monitor unusual access patterns
- Enable bucket notifications

### 💾 **Backup Strategy**
- S3 Cross-Region Replication
- Lifecycle policies: IA → Glacier
- Regular backup verification

**🎉 Happy S3 Integration!** ☁️📸 

# Test quyền đã hoạt động chưa
node -e "
const AWS = require('@aws-sdk/client-s3');
const s3 = new AWS.S3Client({
  region: 'ap-southeast-1',
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
});
console.log('S3 Client created successfully!');
" 
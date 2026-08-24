require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const emailjs = require('@emailjs/nodejs');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer'); // ✅ TAMBAH BARU
const UAParser = require('ua-parser-js');

const app = express();

// ===== 配置 =====
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === process.env.CLIENT_URL || /^https?:\/\/(localhost|127\.0\.0.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve the frontend files from the project root.
app.use(express.static(__dirname));

function parseUserAgent(userAgent) {
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();
    return {
        device: ua.device.model || ua.device.type || 'Unknown Device',
        browser: ua.browser.name + ' ' + (ua.browser.version || '')
    };
}

const path = require('path');
// ... 上面是你定义 API 的代码 ...

// 托管静态文件（假设前端构建后的文件在 dist 文件夹）
app.use(express.static(path.join(__dirname, 'dist')));

// 兜底路由：解决 Cannot GET / 的问题，并且支持前端（如React）的路由跳转
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ========== Email Configuration (Nodemailer) ========== ✅ TAMBAH BARU
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'pawcare@gmail.com',
        pass: process.env.EMAIL_PASS || 'xxxx xxxx xxxx xxxx'
    }
});

// ========== Supabase 初始化 ==========
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
// 👇 新增这行！专门用来绕过 RLS 的安全查询
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ========== 确保存储桶存在 ==========   <-- 从这里开始粘贴
async function ensureBucketExists(bucketName) {
    try {
        const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
        if (listError) throw listError;
        const exists = buckets.some(b => b.name === bucketName);
        if (!exists) {
            const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 5242880,
            });
            if (createError) throw createError;
            console.log(`✅ Bucket "${bucketName}" created.`);
        }
        return true;
    } catch (err) {
        console.error(`❌ Error ensuring bucket "${bucketName}":`, err.message);
        return false;
    }
}   // <-- 到这里结束

// ================================================================ ✅ TAMBAH BARU
// SEND DELETE CONFIRMATION EMAIL (With direct delete link)
// ================================================================
async function sendDeleteConfirmationEmail(customerEmail, customerName, deleteToken) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const deleteLink = `${baseUrl}/api/delete-account?token=${deleteToken}&email=${encodeURIComponent(customerEmail)}`;
    
    const mailOptions = {
        from: `"PawCare Booking System" <${process.env.EMAIL_USER || 'pawcare@gmail.com'}>`,
        to: customerEmail,
        subject: '⚠️ Account Deletion Request - PawCare',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f0eb; padding: 20px; }
                    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #efebe6; }
                    .header h1 { color: #a75e31; margin: 0; }
                    .content { padding: 20px 0; }
                    .content p { color: #555; line-height: 1.6; }
                    .warning { background: #fef7e0; border-left: 4px solid #d97706; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
                    .warning strong { color: #92400e; }
                    .btn { display: inline-block; padding: 14px 36px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
                    .btn:hover { background: #b91c1c; }
                    .btn-container { text-align: center; }
                    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #efebe6; font-size: 12px; color: #999; }
                    .link-expiry { color: #7a7a7a; font-size: 13px; margin-top: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🐾 PawCare</h1>
                        <p style="color: #7a7a7a; margin: 0;">Booking System</p>
                    </div>
                    <div class="content">
                        <h2>Account Deletion Request</h2>
                        <p>Dear <strong>${customerName}</strong>,</p>
                        <p>An admin has initiated a request to delete your PawCare account.</p>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This action will permanently delete all your data including:
                            <ul style="margin: 8px 0 0 20px; color: #555;">
                                <li>Your profile information</li>
                                <li>Pet profiles</li>
                                <li>Booking history</li>
                                <li>Reviews</li>
                            </ul>
                        </div>
                        
                        <div class="btn-container">
                            <a href="${deleteLink}" class="btn">🗑️ Delete My Account Now</a>
                        </div>
                        
                        <p style="text-align: center; font-size: 14px; color: #7a7a7a;">
                            <strong>OR</strong> copy this link into your browser:<br>
                            <span style="word-break: break-all; font-size: 12px; color: #999;">${deleteLink}</span>
                        </p>
                        
                        <p class="link-expiry">⏳ This link will expire in <strong>7 days</strong>.</p>
                        
                        <p style="margin-top: 16px; color: #7a7a7a; font-size: 13px;">
                            If you did not request this deletion, please <a href="mailto:${process.env.EMAIL_USER || 'pawcare@gmail.com'}" style="color: #a75e31;">contact us</a> immediately.
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2026 PawCare Booking System — Paw Walker Grooming House</p>
                    </div>
                </div>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Deletion email sent to ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
}

// ================================================================ ✅ TAMBAH BARU
// SEND DELETION CONFIRMATION EMAIL (After successful delete)
// ================================================================
async function sendDeletionConfirmedEmail(customerEmail, customerName) {
    const mailOptions = {
        from: `"PawCare Booking System" <${process.env.EMAIL_USER || 'pawcare@gmail.com'}>`,
        to: customerEmail,
        subject: '✅ Account Deleted Successfully - PawCare',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f0eb; padding: 20px; }
                    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #efebe6; }
                    .header h1 { color: #a75e31; margin: 0; }
                    .content { padding: 20px 0; text-align: center; }
                    .content p { color: #555; line-height: 1.6; }
                    .success-icon { font-size: 64px; margin: 16px 0; }
                    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #efebe6; font-size: 12px; color: #999; }
                    .btn { display: inline-block; padding: 12px 32px; background: #5a361a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
                    .btn:hover { background: #402410; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🐾 PawCare</h1>
                        <p style="color: #7a7a7a; margin: 0;">Booking System</p>
                    </div>
                    <div class="content">
                        <div class="success-icon">✅</div>
                        <h2>Account Deleted Successfully</h2>
                        <p>Dear <strong>${customerName}</strong>,</p>
                        <p>Your PawCare account has been successfully deleted as requested.</p>
                        <p>All your data has been permanently removed from our system.</p>
                        <br>
                        <p style="color: #7a7a7a; font-size: 13px;">
                            If you wish to use our services again in the future,<br>
                            you are welcome to create a new account anytime.
                        </p>
                        <p style="color: #7a7a7a; font-size: 13px; margin-top: 16px;">
                            Thank you for being part of PawCare! 🐾
                        </p>
                        <div style="margin-top: 16px;">
                            <a href="${process.env.BASE_URL || 'http://localhost:5000'}" class="btn">🏠 Back to Home</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2026 PawCare Booking System — Paw Walker Grooming House</p>
                    </div>
                </div>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Deletion confirmed email sent to ${customerEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending confirmation email:', error);
        return false;
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ========== 辅助函数 ==========
const getCustomerId = (req) => {
  const auth = req.headers.authorization;
  if (!auth) throw new Error('No token');
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded.customer_id; // 无论是 admin_id 还是 customer_id，都通过这个字段返回
};

// ========== 辅助：从 token 解析用户信息 ==========
async function getUserInfo(req) {
  const auth = req.headers.authorization;
  if (!auth) throw new Error('No token');
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);

  // 如果是管理员，校验 session_version 是否匹配
    if (decoded.role === 'admin') {
    const { data: admin, error: adminErr } = await supabaseAdmin.from('admin').select('session_version').eq('admin_id', decoded.customer_id).maybeSingle();
    // 即使报错也不阻断登录，只在成功查到并且版本不匹配时才踢下线
    if (!adminErr && admin && admin.session_version !== decoded.session_version) {
      throw new Error('Session expired');
    }
  }
  return decoded;
}

// 🆕 TAMBAHAN: Middleware untuk Admin Authentication
async function isAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        // Verify session version
        if (decoded.role === 'admin') {
            const { data: admin, error: adminErr } = await supabaseAdmin
                .from('admin')
                .select('session_version')
                .eq('admin_id', decoded.customer_id)
                .maybeSingle();

            // 只要没报错，且用户存在且版本不一致才判定为过期
            if (!adminErr && admin && admin.session_version !== decoded.session_version) {
                return res.status(401).json({ success: false, message: 'Session expired' });
            }
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Admin auth error:', err);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        res.status(500).json({ success: false, message: 'Authentication error' });
    }
}

// 密码策略
const passwordPolicy = {
  minLength: 8,
  maxLength: 16,
  hasLowercase: /[a-z]/,
  hasUppercase: /[A-Z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*]/
};
function isPasswordValid(password) {
  return password.length >= passwordPolicy.minLength &&
         password.length <= passwordPolicy.maxLength &&
         passwordPolicy.hasLowercase.test(password) &&
         passwordPolicy.hasUppercase.test(password) &&
         passwordPolicy.hasNumber.test(password) &&
         passwordPolicy.hasSpecial.test(password);
}

// 检查日期是否为周四
function isThursday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 4;
}

// 上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// 评价照片上传（单张）
const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// ========== 1. 注册 ==========
app.post('/api/register', async (req, res) => {
  try {
    const { full_name, email, password, phone_number, address } = req.body;
    if (!isPasswordValid(password)) {
      return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
    }
    const { data: existing } = await supabase
      .from('customer')
      .select('customer_id')
      .eq('email', email)
      .maybeSingle();
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from('customer')
      .insert([{ full_name, email, password: hashed, phone_number, address }]);
    if (error) throw error;
    res.status(201).json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 2. 登录（同时支持 customer 和 admin） ==========
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // 1. 先查 customer 表
    let { data: customer, error } = await supabaseAdmin
      .from('customer')
      .select('customer_id, full_name, email, password')
      .eq('email', email)
      .maybeSingle();

    let role = 'customer';
    let user = customer;

    if (error) {
      console.error('Customer query error:', error);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }

    // 如果 customer 存在，验证密码
    if (customer) {
      const match = await bcrypt.compare(password, customer.password);
      if (match) {
        // 登录成功，角色为 customer
        user = customer;
        role = 'customer';
      } else {
        // 密码错误，但可能 admin 表也有该邮箱，继续查 admin
        user = null;
      }
    }

    // 2. 如果 customer 不存在或密码不匹配，再查 admin 表
    if (!user) {
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('admin_id, full_name, email, password')
        .eq('email', email)
        .maybeSingle();

      if (adminError) {
        console.error('Admin query error:', adminError);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      if (admin) {
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
          user = admin;
          role = 'admin';
        }
      }
    }

    // 3. 最终检查
    if (!user) {
      console.log('Invalid credentials for:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // 统一字段名（customer 用 customer_id，admin 用 admin_id）
    const userId = user.customer_id || user.admin_id;

    // 获取当前的 session_version
    let sessionVersion = 1;
    if (role === 'admin') {
        const { data: adminData } = await supabaseAdmin.from('admin').select('session_version').eq('admin_id', userId).maybeSingle(); // <--- 改为 maybeSingle
        sessionVersion = adminData?.session_version || 1;
    }

    const token = jwt.sign(
      { 
        customer_id: userId,
        email: user.email,
        role: role,
        session_version: sessionVersion // 添加版本号
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 在生成 token 之后，返回之前添加：
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    const { device, browser } = parseUserAgent(userAgent);

    // 插入会话记录
    const { error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .insert({
        admin_id: userId,
        token: token,
        device: device,
        browser: browser,
        ip: ip,
        is_active: true
      });

    if (sessionError) {
      console.error('Failed to record session:', sessionError);
      // 不影响登录，仅记录错误
    }

    // 登录成功后更新 admin 表的 last_login
    if (role === 'admin') {
        const now = new Date().toISOString();
        await supabaseAdmin
            .from('admin')
            .update({ last_login: now })
            .eq('admin_id', userId);
    }

    // 返回用户信息（包含 role）
    res.json({
      success: true,
      token,
      customer: {
        id: userId,
        name: user.full_name,
        email: user.email,
        role: role
      }
    });

  } catch (err) {
    console.error('Login exception:', err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 3. 获取个人资料 ==========
app.get('/api/profile', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';

    let table = 'customer';
    let idField = 'customer_id';
    let selectFields = 'customer_id, full_name, email, phone_number, address, profile_photo, created_at';
    if (role === 'admin') {
      table = 'admin';
      idField = 'admin_id';
      // 管理员表没有 created_at 字段，必须删掉以免报错
      selectFields = 'admin_id, full_name, email, phone_number, profile_photo'; 
    }

    // 使用 supabaseAdmin 绕过 RLS，且改为 maybeSingle() 防止报错
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(selectFields)
      .eq(idField, userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 4. 更新个人资料 ==========
app.put('/api/profile', async (req, res) => {
  let userId;
  let role;
  let table;
  let idField;
  try {
    console.log('Profile update request received:', req.body);
    const userInfo = await getUserInfo(req);
    userId = userInfo.customer_id;
    role = userInfo.role || 'customer';
    const { phone_number, address, full_name } = req.body; // 增加 full_name

    table = 'customer';
    idField = 'customer_id';
    let updateData = { phone_number, address };
    if (role === 'admin') {
      table = 'admin';
      idField = 'admin_id';
      updateData = { phone_number, full_name }; // admin 可更新 full_name 和 phone
    }

  // 防止 RLS 阻止 Admin 更新自己的资料
  const { error } = await supabaseAdmin
    .from(table)
    .update(updateData)
    .eq(idField, userId);
    if (error) throw error;
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // 更新资料修改时间
    if (role === 'admin') {
        await supabaseAdmin
            .from('admin')
            .update({ profile_updated_at: new Date().toISOString() })
            .eq(idField, userId);
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 5. 上传头像 ==========
app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';

    await ensureBucketExists('profile_photos');
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profile_photos/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('profile_photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl;

    let table = 'customer';
    let idField = 'customer_id';
    if (role === 'admin') {
      table = 'admin';
      idField = 'admin_id';
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ profile_photo: avatarUrl })
      .eq(idField, userId);
    if (updateError) throw updateError;

    res.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 6. 修改密码 ==========
app.put('/api/profile/password', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { currentPassword, newPassword } = req.body;

    // 校验密码策略 (已有)
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be 8-16 characters with at least 1 uppercase, 1 number, and 1 special character (!@#$%^&*).' });
    }

    let table = 'customer';
    let idField = 'customer_id';
    if (role === 'admin') {
      table = 'admin';
      idField = 'admin_id';
    }

    const { data: user, error: fetchError } = await supabaseAdmin
      .from(table)
      .select('password')
      .eq(idField, userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ password: hashed })
      .eq(idField, userId);

    if (updateError) throw updateError;
    // 更新密码修改时间
    if (role === 'admin') {
        await supabaseAdmin
            .from('admin')
            .update({ password_updated_at: new Date().toISOString() })
            .eq(idField, userId);
    }
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password update exception:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 7. 宠物 CRUD ==========
app.get('/api/pets', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';

    let query = supabaseAdmin.from('pet').select('*');
    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    }
    // 如果是 admin，不加过滤，返回所有宠物

    const { data, error } = await query;
    if (error) throw error;

    // 映射字段（保持原有格式）
    const mapped = data.map(pet => ({
      pet_id: pet.pet_id,
      name: pet.pet_name,
      breed: pet.breed,
      dob: pet.date_of_birth,
      gender: pet.gender,
      weight: pet.weight,
      notes: pet.special_notes,
      photo_url: pet.pet_photo,
      species: pet.species
    }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.post('/api/pets', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';

    const { name, breed, dob, gender, weight, notes, photo_url, species, customer_id } = req.body;

    let insertData = {
      pet_name: name,
      breed,
      date_of_birth: dob,
      gender,
      weight,
      special_notes: notes,
      pet_photo: photo_url,
      species: species || 'dog'
    };

    if (role === 'customer') {
      insertData.customer_id = userId;
    } else if (role === 'admin') {
      // admin 必须提供 customer_id
      if (!customer_id) {
        return res.status(400).json({ success: false, message: 'Customer ID is required for admin.' });
      }
      // 验证该客户是否存在（可选）
      const { data: cust } = await supabaseAdmin
        .from('customer')
        .select('customer_id')
        .eq('customer_id', customer_id)
        .single();
      if (!cust) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
      insertData.customer_id = customer_id;
    }

    const { data, error } = await supabaseAdmin
      .from('pet')
      .insert([insertData])
      .select('*');
    if (error) throw error;
    const pet = data[0];
    const mapped = {
      pet_id: pet.pet_id,
      name: pet.pet_name,
      breed: pet.breed,
      dob: pet.date_of_birth,
      gender: pet.gender,
      weight: pet.weight,
      notes: pet.special_notes,
      photo_url: pet.pet_photo,
      species: pet.species
    };
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.put('/api/pets/:pet_id', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { pet_id } = req.params;
    const { name, breed, dob, gender, weight, notes, photo_url, species, customer_id } = req.body;

    let updateData = { pet_name: name, breed, date_of_birth: dob, gender, weight, special_notes: notes, pet_photo: photo_url, species };

    let query = supabaseAdmin.from('pet').update(updateData).eq('pet_id', pet_id);
    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    }
    // admin 不追加 customer_id 条件，可以修改任意宠物（也可以要求传入 customer_id 做双重验证）

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true, message: 'Pet updated.' });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.delete('/api/pets/:pet_id', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { pet_id } = req.params;

    // 检查是否有待处理预约（所有角色都需要检查）
    const { data: bookings, error: checkError } = await supabaseAdmin
      .from('booking')
      .select('booking_id')
      .eq('pet_id', pet_id)
      .in('status', ['pending', 'upcoming']);
    if (checkError) throw checkError;
    if (bookings && bookings.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete pet with pending or upcoming bookings.' });
    }

    let query = supabaseAdmin.from('pet').delete().eq('pet_id', pet_id);
    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    }
    // admin 不加 customer_id 条件

        const { error } = await query;
    if (error) throw error;
    
    // 添加日志
    console.log(`✅ Pet ${pet_id} deleted by user ${userId} (role: ${role})`);
    
    res.json({ success: true, message: 'Pet deleted.' });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 8. 服务列表 ==========
app.get('/api/services', async (req, res) => {
  try {

    // 使用 supabaseAdmin 绕过 RLS 读取服务列表
    const { data: services, error: svcError } = await supabaseAdmin
      .from('service')
      .select('service_id, service_name, category, duration, description');
    if (svcError) throw svcError;

    const { data: prices, error: priceError } = await supabaseAdmin
      .from('service_price')
      .select('service_id, species, starting_price');
    if (priceError) throw priceError;

    const result = services.map(svc => {
      const svcPrices = prices.filter(p => p.service_id === svc.service_id);
      const dogPrice = svcPrices.find(p => p.species?.toLowerCase() === 'dog')?.starting_price || null;
      const catPrice = svcPrices.find(p => p.species?.toLowerCase() === 'cat')?.starting_price || null;
      return {
        service_id: svc.service_id,
        service_name: svc.service_name,
        category: svc.category,
        duration: svc.duration,
        description: svc.description,
        price_dog: dogPrice,
        price_cat: catPrice
      };
    });

    console.log('Services result:', result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== Admin Service Management ==========
app.get('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching admin categories:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });
    const { data, error } = await supabaseAdmin.from('categories').insert([{ name: name.trim() }]).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/categories/:id', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabaseAdmin.from('categories').update({ name: name?.trim() }).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('categories').delete().eq('id', req.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/services', isAdmin, async (req, res) => {
  try {
    const { data: services, error: serviceError } = await supabaseAdmin
      .from('service')
      .select('service_id, service_name, category, duration, description, pet_type, price, created_at')
      .order('created_at', { ascending: false });
    if (serviceError) throw serviceError;

    const { data: prices, error: priceError } = await supabaseAdmin
      .from('service_price')
      .select('service_id, species, starting_price');
    if (priceError) throw priceError;

    const data = services.map(service => {
      const servicePrices = prices.filter(price => price.service_id === service.service_id);
      const dogPrice = servicePrices.find(price => price.species?.toLowerCase() === 'dog')?.starting_price;
      const catPrice = servicePrices.find(price => price.species?.toLowerCase() === 'cat')?.starting_price;
      return {
        ...service,
        price: service.price ?? dogPrice ?? catPrice ?? 0,
        price_dog: dogPrice ?? null,
        price_cat: catPrice ?? null
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching admin services:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/services', isAdmin, async (req, res) => {
  try {
    const { service_name, category, duration, description, pet_type, price } = req.body;
    const numericPrice = Number(price);
    if (!service_name || !category || !duration || !pet_type || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: 'Required service fields are missing.' });
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('service')
      .insert([{ service_name, category, duration, description: description || null, pet_type, price: numericPrice }])
      .select('*')
      .single();
    if (serviceError) throw serviceError;

    const { error: priceError } = await supabaseAdmin
      .from('service_price')
      .insert([{ service_id: service.service_id, species: pet_type, starting_price: numericPrice }]);
    if (priceError) {
      await supabaseAdmin.from('service').delete().eq('service_id', service.service_id);
      throw priceError;
    }

    res.status(201).json({ success: true, data: service });
  } catch (err) {
    console.error('Error creating admin service:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/services/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, price } = req.body;
    const updateData = {};
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) updateData.price = Number(price);

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('service')
      .update(updateData)
      .eq('service_id', id)
      .select('*')
      .maybeSingle();
    if (serviceError) throw serviceError;
    if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });

    if (price !== undefined) {
      const { error: priceError } = await supabaseAdmin
        .from('service_price')
        .update({ starting_price: Number(price) })
        .eq('service_id', id);
      if (priceError) throw priceError;
    }

    res.json({ success: true, data: service });
  } catch (err) {
    console.error('Error updating admin service:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/services/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseAdmin.from('booking_service').delete().eq('service_id', id);
    const { error: priceError } = await supabaseAdmin.from('service_price').delete().eq('service_id', id);
    if (priceError) throw priceError;
    const { data, error } = await supabaseAdmin
      .from('service')
      .delete()
      .eq('service_id', id)
      .select('service_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Service not found.' });
    res.json({ success: true, message: 'Service deleted.' });
  } catch (err) {
    console.error('Error deleting admin service:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== Admin Reports APIs ==========

// 1. 总览统计
app.get('/api/admin/stats', isAdmin, async (req, res) => {
  try {
    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from('booking')
      .select('status');
    if (bookingError) throw bookingError;

    const totalBookings = bookings.length;
    const bookingStatuses = bookings.map(booking => String(booking.status || '').trim().toLowerCase());
    const pendingBookings = bookingStatuses.filter(status => status === 'pending').length;
    const confirmedBookings = bookingStatuses.filter(status => status === 'confirmed').length;
    const completedBookings = bookingStatuses.filter(status => status === 'completed').length;
    const cancelledBookings = bookingStatuses.filter(status => status === 'cancelled').length;

    const { count: totalCustomers } = await supabaseAdmin
      .from('customer')
      .select('*', { count: 'exact', head: true });

    const { count: totalPets } = await supabaseAdmin
      .from('pet')
      .select('*', { count: 'exact', head: true });

    const { data: reviews } = await supabaseAdmin
      .from('review')
      .select('rating');
    let avgRating = 0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((a, b) => a + b.rating, 0);
      avgRating = sum / reviews.length;
    }

    res.json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        totalCustomers,
        totalPets,
        completedBookings,
        avgRating: parseFloat(avgRating.toFixed(1))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/notifications/unread-count', isAdmin, async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from('customer_notifications')
      .select('notification_id', { count: 'exact', head: true })
      .eq('is_read', false);
    if (error) throw error;
    res.json({ success: true, count: count || 0 });
  } catch (err) {
    console.error('Error fetching unread notification count:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 预约趋势（最近30天）
app.get('/api/admin/bookings-trend', async (req, res) => {
  try {
    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { data, error } = await supabaseAdmin
      .from('booking')
      .select('booking_date')
      .gte('booking_date', dates[0])
      .lte('booking_date', dates[29]);

    if (error) throw error;

    const countMap = {};
    data.forEach(b => {
      const date = b.booking_date;
      countMap[date] = (countMap[date] || 0) + 1;
    });

    const trend = dates.map(date => ({
      date,
      count: countMap[date] || 0
    }));

    res.json({ success: true, data: trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. 热门服务
app.get('/api/admin/popular-services', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('booking_service')
      .select(`
        service_id,
        service:service_id (service_name)
      `);

    if (error) throw error;

    const countMap = {};
    data.forEach(item => {
      const name = item.service?.service_name || 'Unknown';
      countMap[name] = (countMap[name] || 0) + 1;
    });

    const total = data.length;
    const result = Object.entries(countMap).map(([name, count]) => ({
      service_name: name,
      count,
      percentage: total ? ((count / total) * 100).toFixed(1) : 0
    })).sort((a, b) => b.count - a.count);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. 最活跃客户（前5）
app.get('/api/admin/top-customers', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('booking')
      .select(`
        customer_id,
        customer:customer_id (full_name)
      `);

    if (error) throw error;

    const countMap = {};
    data.forEach(b => {
      const id = b.customer_id;
      if (!countMap[id]) {
        countMap[id] = { name: b.customer?.full_name || 'Unknown', count: 0 };
      }
      countMap[id].count++;
    });

    const sorted = Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));

    res.json({ success: true, data: sorted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. 月度趋势（近12个月）
app.get('/api/admin/monthly-trend', async (req, res) => {
  try {
    const today = new Date();
    const months = [];
    const labels = [];
    // 只循环最近6个月
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      labels.push(`${year}-${month}`);
    }

    // 查询 booking 按月份分组计数
    const { data, error } = await supabaseAdmin
      .from('booking')
      .select('booking_date')
      .gte('booking_date', months[0] + '-01')
      .lte('booking_date', months[months.length - 1] + '-31');

    if (error) throw error;

    const countMap = {};
    data.forEach(b => {
      const date = b.booking_date;
      if (date) {
        const monthKey = date.substring(0, 7); // "YYYY-MM"
        countMap[monthKey] = (countMap[monthKey] || 0) + 1;
      }
    });

    const trend = months.map(month => ({
      month,
      count: countMap[month] || 0
    }));

    // 同时获取 completed 数据（可选）
    const { data: completedData, error: completedError } = await supabaseAdmin
      .from('booking')
      .select('booking_date')
      .eq('status', 'completed')
      .gte('booking_date', months[0] + '-01')
      .lte('booking_date', months[months.length - 1] + '-31');

    if (!completedError) {
      const completedMap = {};
      completedData.forEach(b => {
        const date = b.booking_date;
        if (date) {
          const monthKey = date.substring(0, 7);
          completedMap[monthKey] = (completedMap[monthKey] || 0) + 1;
        }
      });
      trend.forEach(item => {
        item.completed = completedMap[item.month] || 0;
      });
    }

    res.json({ success: true, data: { labels, trend } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== 9. 预约 CRUD ==========
app.get('/api/bookings', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';

    let query = supabaseAdmin
      .from('booking')
      .select(`
        booking_id,
        booking_date,
        booking_time,
        check_in_datetime,
        check_out_datetime,
        status,
        special_notes,
        reschedule_status,
        reschedule_requested_date,
        reschedule_requested_time,
        pet:pet_id(pet_name, breed, species, pet_photo),
        booking_service (
          service_id,
          estimated_price,
          service:service_id(service_name, category)
        )
      `)
      .order('booking_date', { ascending: false });

    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    }
    // admin 不加过滤，查看全部

    const { data, error } = await query;
    if (error) throw error;

    // 映射数据（与原来相同）
    const bookings = data.map(b => {
      const services = b.booking_service || [];
      return {
        booking_id: b.booking_id,
        booking_date: b.booking_date,
        booking_time: b.booking_time,
        check_in_datetime: b.check_in_datetime,
        check_out_datetime: b.check_out_datetime,
        status: b.status,
        reschedule_status: b.reschedule_status || 'none',
        reschedule_requested_date: b.reschedule_requested_date || null,
        reschedule_requested_time: b.reschedule_requested_time || null,
        total_price: (b.booking_service || []).reduce((sum, s) => sum + (s.estimated_price || 0), 0),
        special_notes: b.special_notes,
        pet: b.pet ? {
          name: b.pet.pet_name,
          breed: b.pet.breed,
          species: b.pet.species,
          photo_url: b.pet.pet_photo
        } : null,
        services: services.map(s => ({
          service_id: s.service_id,
          service_name: s.service?.service_name,
          category: s.service?.category,
          estimated_price: s.estimated_price
        }))
      };
    });
    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 创建预约 ==========
app.post('/api/bookings', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { 
            pet_id, 
            service_ids, 
            booking_date, 
            booking_time, 
            special_notes, 
            check_in_datetime, 
            check_out_datetime 
        } = req.body;

        // ===== 1. 基础验证 =====
        if (!pet_id) {
            return res.status(400).json({ success: false, message: 'Please select a pet.' });
        }
        if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one service.' });
        }
        if (!booking_date) {
            return res.status(400).json({ success: false, message: 'Booking date is required.' });
        }
        if (!booking_time) {
            return res.status(400).json({ success: false, message: 'Booking time is required.' });
        }

        // ===== 2. 检查周四闭店 =====
        function isThursday(dateStr) {
            if (!dateStr) return false;
            const d = new Date(dateStr + 'T00:00:00');
            return d.getDay() === 4;
        }
        if (isThursday(booking_date)) {
            return res.status(400).json({ success: false, message: 'We are closed on Thursdays. Please choose another date.' });
        }
        if (check_in_datetime && isThursday(check_in_datetime)) {
            return res.status(400).json({ success: false, message: 'Check-in cannot be on Thursday (closed).' });
        }
        if (check_out_datetime && isThursday(check_out_datetime)) {
            return res.status(400).json({ success: false, message: 'Check-out cannot be on Thursday (closed).' });
        }

        // ===== 3. 验证宠物归属 =====
        const { data: pet, error: petError } = await supabaseAdmin
            .from('pet')
            .select('pet_id, species')
            .eq('pet_id', pet_id)
            .eq('customer_id', customer_id)
            .single();
        if (petError || !pet) {
            return res.status(404).json({ success: false, message: 'Pet not found or does not belong to you.' });
        }

        // ===== 4. 创建 booking 主记录 =====
        const booking_id = crypto.randomUUID();
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('booking')
            .insert([{
                booking_id,  
                customer_id,
                pet_id,
                booking_date,
                booking_time,
                check_in_datetime: check_in_datetime || null,
                check_out_datetime: check_out_datetime || null,
                special_notes: special_notes || '',
                status: 'pending',
                reschedule_status: 'none'
            }])
            .select('booking_id')
            .single();
        if (bookingError) throw bookingError;

        // ===== 5. 查询服务价格（根据宠物品种） =====
        const species = pet.species?.toLowerCase() || 'dog';
        const { data: priceData, error: priceError } = await supabaseAdmin
            .from('service_price')
            .select('service_id, starting_price')
            .in('service_id', service_ids)
            .eq('species', species);
        if (priceError) throw priceError;

        const priceMap = {};
        priceData.forEach(p => {
            priceMap[p.service_id] = p.starting_price || 0;
        });

        // ===== 6. 创建 booking_service 关联 =====
        const bookingServices = service_ids.map(service_id => ({
            booking_id: booking.booking_id,
            service_id: service_id,
            estimated_price: priceMap[service_id] || 0
        }));

        const { error: bsError } = await supabaseAdmin
            .from('booking_service')
            .insert(bookingServices);
        if (bsError) throw bsError;

        // ===== 7. 查询服务名称（用于响应） =====
        const { data: services, error: svcError } = await supabaseAdmin
            .from('service')
            .select('service_id, service_name')
            .in('service_id', service_ids);
        if (svcError) throw svcError;

        const totalPrice = bookingServices.reduce((sum, bs) => sum + bs.estimated_price, 0);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully.',
            data: {
                booking_id: booking.booking_id,
                services: services || [],
                total_price: totalPrice
            }
        });

    } catch (err) {
        console.error('❌ Create booking error:', err);
        if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        res.status(500).json({ 
            success: false, 
            message: isProduction ? 'Internal server error' : err.message 
        });
    }
});

app.post('/api/bookings/:booking_id/reschedule-request', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id } = req.params;
    const { new_date, new_time } = req.body;

    if (!new_date || !new_time) {
      return res.status(400).json({ success: false, message: 'New date and time are required.' });
    }

    // 验证预约是否存在且属于当前用户，且状态为 pending 或 upcoming
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select('status, booking_date, booking_time')
      .eq('booking_id', booking_id)
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (!['pending', 'upcoming'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or upcoming bookings can be rescheduled.' });
    }

    // 检查新日期是否为周四（闭店日）
    if (isThursday(new_date)) {
      return res.status(400).json({ success: false, message: 'We are closed on Thursdays. Please choose another date.' });
    }

    // 更新 booking 表，记录请求
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('booking')
      .update({
        reschedule_requested_date: new_date,
        reschedule_requested_time: new_time,
        reschedule_status: 'pending'
      })
      .eq('booking_id', booking_id)
      .select('reschedule_status');

    if (updateError) throw updateError;
    console.log('✅ Reschedule status updated to:', updatedData[0]?.reschedule_status);

    // （可选）发送通知给 Admin（例如通过邮件或系统通知，此处略）
    res.json({ success: true, message: 'Reschedule request submitted. Waiting for admin approval.' });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.put('/api/bookings/:booking_id/reschedule-approve', async (req, res) => {
  try {
    // 此处应该验证当前用户是否为 Admin，暂略
    const { booking_id } = req.params;
    const { action } = req.body; // 'approve' 或 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    // 查询当前预约的请求状态
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select('reschedule_status, reschedule_requested_date, reschedule_requested_time, booking_date, booking_time, status')
      .eq('booking_id', booking_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.reschedule_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending reschedule request for this booking.' });
    }

    if (action === 'approve') {
      // 更新实际预约日期和时间，并将 status 改为 'rescheduled'（或保持 'upcoming'）
      const newDate = booking.reschedule_requested_date;
      const newTime = booking.reschedule_requested_time;
      // 可选：保留原日期在备注中，或者记录变更历史

      const { error: updateError } = await supabaseAdmin
        .from('booking')
        .update({
          booking_date: newDate,
          booking_time: newTime,
          reschedule_status: 'approved',
          status: 'upcoming'  // 或 'rescheduled'
        })
        .eq('booking_id', booking_id);

      if (updateError) throw updateError;
      res.json({ success: true, message: 'Reschedule request approved. Booking updated.' });
    } else { // reject
      const { error: updateError } = await supabaseAdmin
        .from('booking')
        .update({ reschedule_status: 'rejected' })
        .eq('booking_id', booking_id);

      if (updateError) throw updateError;
      res.json({ success: true, message: 'Reschedule request rejected.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 取消改期请求 ==========
app.put('/api/bookings/:booking_id/reschedule-cancel', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id } = req.params;

    // 验证预约是否存在且属于当前用户
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select('reschedule_status')
      .eq('booking_id', booking_id)
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.reschedule_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending reschedule request to cancel.' });
    }

    // 重置改期状态
    const { error: updateError } = await supabaseAdmin
      .from('booking')
      .update({
        reschedule_status: 'none',
        reschedule_requested_date: null,
        reschedule_requested_time: null
      })
      .eq('booking_id', booking_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Reschedule request cancelled.' });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 取消预约 ==========
app.put('/api/bookings/:booking_id/cancel', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id } = req.params;

    // 验证预约是否存在且属于当前用户
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select('status')
      .eq('booking_id', booking_id)
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // 已完成的预约或已取消的预约不能再次取消
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking cannot be cancelled.' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('booking_id', booking_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 10. 评价 (修改版，包含回复) ==========
app.get('/api/reviews', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    
    // 1. 获取所有 Review
    const { data: reviews, error } = await supabaseAdmin
        .from('review')
        .select(`
            review_id,
            booking_id,
            customer_id,
            service_id,
            rating,
            comment,
            review_photo,
            review_date,
            customer:customer_id (full_name, profile_photo),
            service:service_id (service_name)
        `)
        .order('review_date', { ascending: false });
    if (error) throw error;

    // 2. 获取所有点赞
    const { data: likes, error: likesError } = await supabaseAdmin
        .from('review_likes')
        .select('review_id, customer_id');
    if (likesError) throw likesError;

    // 3. 获取所有回复 (新增)
    const { data: repliesData, error: repliesError } = await supabaseAdmin
      .from('review_replies')
      .select(`
        reply_id, review_id, reply_text, created_at, parent_id,
        customer:customer_id (full_name, profile_photo),
        admin:admin_id (full_name, profile_photo)
      `)
      .order('created_at', { ascending: true });
    if (repliesError) throw repliesError;

    // 3.5 获取回复的点赞数据
    const { data: replyLikes, error: replyLikesError } = await supabaseAdmin
      .from('review_reply_likes')
      .select('reply_id, customer_id');
    if (replyLikesError) throw replyLikesError;

    const replyLikeCountMap = {};
    const myReplyLikes = replyLikes.filter(l => l.customer_id === userId).map(l => l.reply_id);
    replyLikes.forEach(l => { replyLikeCountMap[l.reply_id] = (replyLikeCountMap[l.reply_id] || 0) + 1; });

    // 4. 数据映射组装
    const myLikes = likes.filter(l => l.customer_id === userId).map(l => l.review_id);
    const likeCountMap = {};
    likes.forEach(l => { likeCountMap[l.review_id] = (likeCountMap[l.review_id] || 0) + 1; });

    // 4. 数据映射组装
    const repliesMap = {};
    repliesData.forEach(r => {
      const user = r.customer || r.admin;
      if (!repliesMap[r.review_id]) repliesMap[r.review_id] = [];
      repliesMap[r.review_id].push({
        reply_id: r.reply_id,
        parent_id: r.parent_id || null, // 👈 添加
        reply_text: r.reply_text,
        created_at: r.created_at,
        reply_like_count: replyLikeCountMap[r.reply_id] || 0, // 👈 添加
        reply_liked_by_me: myReplyLikes.includes(r.reply_id), // 👈 添加
        customer: user ? { full_name: user.full_name, profile_photo: user.profile_photo } : null
      });
    });

    const mapped = reviews.map(r => ({
        review_id: r.review_id,
        booking_id: r.booking_id,
        customer_id: r.customer_id,
        service_id: r.service_id,
        rating: r.rating,
        comment: r.comment,
        review_photo: r.review_photo,
        created_at: r.review_date,
        customer: r.customer ? { full_name: r.customer.full_name, profile_photo: r.customer.profile_photo } : null,
        service_name: r.service?.service_name || null,
        like_count: likeCountMap[r.review_id] || 0,
        liked_by_me: myLikes.includes(r.review_id),
        replies: repliesMap[r.review_id] || []  // 将回复关联到对应评论
    }));
    
    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 获取服务评分统计 ==========
app.get('/api/reviews/stats', async (req, res) => {
    try {
        // 查询所有 review，关联 service_name
        const { data: reviews, error } = await supabaseAdmin
            .from('review')
            .select(`
                rating,
                service:service_id (service_name)
            `);

        if (error) throw error;

        // 统计每个服务的评分和数量
        const statsMap = {};

        reviews.forEach(r => {
            const serviceName = r.service?.service_name || 'General';
            if (!statsMap[serviceName]) {
                statsMap[serviceName] = {
                    totalRating: 0,
                    count: 0
                };
            }
            statsMap[serviceName].totalRating += r.rating;
            statsMap[serviceName].count += 1;
        });

        // 转换为数组并计算平均分
        const result = Object.keys(statsMap).map(name => {
            const { totalRating, count } = statsMap[name];
            return {
                service_name: name,
                avg_rating: count > 0 ? (totalRating / count) : 0,
                review_count: count
            };
        });

        // 按评分高低排序
        result.sort((a, b) => b.avg_rating - a.avg_rating);

        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 点赞切换 (Toggle Like) ==========
app.post('/api/reviews/:review_id/like', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { review_id } = req.params;

        // 检查是否已点赞
        const { data: existing, error: checkError } = await supabaseAdmin
            .from('review_likes')
            .select('review_id')
            .eq('review_id', review_id)
            .eq('customer_id', customer_id)
            .maybeSingle();

        if (checkError) throw checkError;

        let action = 'liked';
        if (existing) {
            // 已点赞 → 取消点赞
            const { error: deleteError } = await supabaseAdmin
                .from('review_likes')
                .delete()
                .eq('review_id', review_id)
                .eq('customer_id', customer_id);
            if (deleteError) throw deleteError;
            action = 'unliked';
        } else {
            // 未点赞 → 添加点赞
            const { error: insertError } = await supabaseAdmin
                .from('review_likes')
                .insert([{ review_id, customer_id }]);
            if (insertError) throw insertError;
            action = 'liked';
        }

        // 获取最新点赞数
        const { count, error: countError } = await supabaseAdmin
            .from('review_likes')
            .select('review_id', { count: 'exact', head: true })
            .eq('review_id', review_id);
        if (countError) throw countError;

        res.json({
            success: true,
            action: action,
            like_count: count || 0
        });
    } catch (err) {
        console.error(err);
        if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
    }
});

app.post('/api/reviews', reviewUpload.single('review_photo'), async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    // ===== 确保存储桶存在 =====
    await ensureBucketExists('review_photos');   // <-- 加了这一行
    const { booking_id, service_id, rating, comment } = req.body;
    let review_photo_url = null;

    // 如果有上传照片，先上传到 Supabase Storage
    if (req.file) {
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `review_${Date.now()}.${fileExt}`;
      const filePath = `review_photos/${fileName}`;

      // 👇 改用 supabaseAdmin 来上传，绕过 RLS
      const { error: uploadError } = await supabaseAdmin.storage
        .from('review_photos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('review_photos')
        .getPublicUrl(filePath);
      review_photo_url = urlData.publicUrl;
    }

    // 如果传了 booking_id，验证
    if (booking_id) {
      const { data: booking, error: checkError } = await supabaseAdmin
        .from('booking')
        .select('status')
        .eq('booking_id', booking_id)
        .eq('customer_id', customer_id)
        .single();
      if (checkError || !booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      if (booking.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Only completed bookings can be reviewed.' });
      }
    }

    if (!service_id && !booking_id) {
      return res.status(400).json({ success: false, message: 'Please provide a service or booking to review.' });
    }

    // 插入评价，包含 review_photo URL
    const { data, error } = await supabaseAdmin
      .from('review')
      .insert([{
        customer_id,
        booking_id: booking_id || null,
        service_id: service_id || null,
        rating: parseInt(rating),
        comment,
        review_photo: review_photo_url,
        review_date: new Date().toISOString()  // 确保有值，避免 not-null 约束
      }])
      .select('*');
    if (error) throw error;

    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 11. OTP 发送与重置密码 ==========
// ==== 修改点：发送 OTP 前验证邮箱是否存在 ====
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

  // 验证邮箱是否已注册（先查 customer，再查 admin）
  let userExists = false;
  const { data: customer, error: customerError } = await supabase
    .from('customer')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (!customerError && customer) {
    userExists = true;
  } else {
    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (!adminError && admin) {
      userExists = true;
    }
  }

  if (!userExists) {
    return res.status(404).json({ success: false, message: 'Email not registered.' });
  }

  // 生成 OTP（后续代码不变）
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('otp_codes')
    .upsert({ email, code: otp, expires_at: expiresAt }, { onConflict: 'email' });
  if (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to store OTP.' });
  }

  emailjs.init({
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  });
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { otp_code: otp, email }
    );
    res.json({ success: true, message: 'OTP sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }
  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
  }

  const { data, error } = await supabase
    .from('otp_codes')
    .select('code, expires_at')
    .eq('email', email)
    .maybeSingle();
  if (error || !data) {
    return res.status(400).json({ success: false, message: 'OTP not found. Request a new one.' });
  }
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('otp_codes').delete().eq('email', email);
    return res.status(400).json({ success: false, message: 'OTP expired.' });
  }
  if (data.code !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  // 先尝试更新 customer 表
  const { data: customerData, error: customerUpdateError } = await supabaseAdmin
    .from('customer')
    .update({ password: hashed })
    .eq('email', email)
    .select('email');

  if (customerUpdateError) {
    console.error(customerUpdateError);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }

  // 如果 customer 表没有匹配的行，则尝试更新 admin 表
  if (!customerData || customerData.length === 0) {
    const { error: adminUpdateError } = await supabaseAdmin
      .from('admin')
      .update({ password: hashed })
      .eq('email', email);
    if (adminUpdateError) {
      console.error(adminUpdateError);
      return res.status(500).json({ success: false, message: 'Failed to update password.' });
    }
  }

  await supabase.from('otp_codes').delete().eq('email', email);
  res.json({ success: true, message: 'Password reset successful.' });
});

// ========== 新增: 回复评论 ==========
app.post('/api/reviews/:review_id/reply', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { review_id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text || reply_text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply text is required.' });
    }

    let insertData = { review_id, reply_text: reply_text.trim() };
    if (role === 'admin') {
      insertData.admin_id = userId;
      insertData.customer_id = null;
    } else {
      insertData.customer_id = userId;
      insertData.admin_id = null;
    }

    const { data, error } = await supabaseAdmin
      .from('review_replies')
      .insert([insertData])
      .select('reply_id, reply_text, created_at, customer_id, admin_id');

    if (error) throw error;

    // 为了前端展示，需要把 customer 或 admin 的信息附上
    const reply = data[0];
    let replyWithUser = { ...reply };
    if (reply.customer_id) {
      const { data: cust } = await supabaseAdmin
        .from('customer')
        .select('full_name, profile_photo')
        .eq('customer_id', reply.customer_id)
        .single();
      replyWithUser.customer = cust;
    } else if (reply.admin_id) {
      const { data: adm } = await supabaseAdmin
        .from('admin')
        .select('full_name, profile_photo')
        .eq('admin_id', reply.admin_id)
        .single();
      replyWithUser.customer = adm; // 前端统一用 customer 字段，但实际是 admin
      replyWithUser.isAdmin = true; // 可以加标记
    }

    res.status(201).json({ success: true, data: replyWithUser });
  } catch (err) {
        // 👇 这样打印会显示非常详细的报错结构，方便你直接去 Render Logs 里看
        console.error('❌ Reply 发送失败详细报错:', JSON.stringify(err, null, 2)); 

        if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
      }
  });

// ========== 新增: 回复点赞 ==========
app.post('/api/replies/:reply_id/like', async (req, res) => {
  try {
    console.log('Reply like request for reply_id:', req.params.reply_id);
    const customer_id = getCustomerId(req);
    const { reply_id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('review_reply_likes')
      .select('id')
      .eq('reply_id', reply_id)
      .eq('customer_id', customer_id)
      .maybeSingle();

    let action = 'liked';
    if (existing) {
      // 已点赞 → 取消点赞
      const { error: deleteError } = await supabaseAdmin.from('review_reply_likes').delete().eq('reply_id', reply_id).eq('customer_id', customer_id);
      if (deleteError) throw deleteError;
      action = 'unliked';
    } else {
      // 未点赞 → 添加点赞
      const { error: insertError } = await supabaseAdmin.from('review_reply_likes').insert([{ reply_id, customer_id }]);
      if (insertError) throw insertError;
    }

    // 获取最新点赞数
    const { count, error: countError } = await supabaseAdmin.from('review_reply_likes').select('id', { count: 'exact', head: true }).eq('reply_id', reply_id);
    if (countError) throw countError;

    res.json({ success: true, action, like_count: count || 0 });
  } catch (err) {
    console.error('Reply like error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== 新增: 回复评论的回复 (子回复) ==========
app.post('/api/replies/:reply_id/reply', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { reply_id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text || reply_text.trim() === '') return res.status(400).json({ success: false, message: 'Reply text is required.' });

    // 找到这条子回复属于哪条主评论
    const { data: targetReply } = await supabaseAdmin.from('review_replies').select('review_id').eq('reply_id', reply_id).maybeSingle();
    if (!targetReply) return res.status(404).json({ success: false, message: 'Reply not found.' });

    let insertData = { review_id: targetReply.review_id, reply_text: reply_text.trim(), parent_id: reply_id };
    if (role === 'admin') {
      insertData.admin_id = userId;
      insertData.customer_id = null;
    } else {
      insertData.customer_id = userId;
      insertData.admin_id = null;
    }

    const { data, error } = await supabaseAdmin.from('review_replies').insert([insertData]).select('*');
    if (error) throw error;

    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    console.error(err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 删除评论（仅限 Admin） ==========
app.delete('/api/reviews/:review_id', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    if (userInfo.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    const { review_id } = req.params;

    // 先删除关联的点赞和回复（如果外键没有级联删除）
    await supabaseAdmin.from('review_likes').delete().eq('review_id', review_id);
    await supabaseAdmin.from('review_replies').delete().eq('review_id', review_id);

    const { error } = await supabaseAdmin
      .from('review')
      .delete()
      .eq('review_id', review_id);
    if (error) throw error;

    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('Delete review error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 新增: 删除回复 (仅Admin或本人) ==========
app.delete('/api/replies/:reply_id', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const userId = userInfo.customer_id;
    const role = userInfo.role || 'customer';
    const { reply_id } = req.params;

    // 获取该回复信息
    const { data: reply, error: fetchError } = await supabaseAdmin
      .from('review_replies')
      .select('*')
      .eq('reply_id', reply_id)
      .maybeSingle();
    if (fetchError || !reply) return res.status(404).json({ success: false, message: 'Reply not found.' });

    // 权限：只有 Admin 或者该回复的作者才能删除
    if (role !== 'admin' && reply.customer_id !== userId && reply.admin_id !== userId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this reply.' });
    }

    // 删除其所有子回复（级联删除）
    const recursiveDelete = async (parentId) => {
      const { data: children } = await supabaseAdmin.from('review_replies').select('reply_id').eq('parent_id', parentId);
      if (children && children.length > 0) {
        for (let child of children) {
          await recursiveDelete(child.reply_id);
        }
      }
      await supabaseAdmin.from('review_replies').delete().eq('reply_id', parentId);
    };

    await recursiveDelete(reply_id);

    // 同时删除该回复的所有点赞
    await supabaseAdmin.from('review_reply_likes').delete().eq('reply_id', reply_id);

    res.json({ success: true, message: 'Reply deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 新增: Admin Session 管理 ==========
app.get('/api/admin/sessions', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    const adminId = userInfo.customer_id;

    // 查询该管理员所有活跃会话
    const { data: sessions, error } = await supabaseAdmin
      .from('admin_sessions')
      .select('id, device, browser, created_at, is_active')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 判断当前会话：通过 token 中的 iat 与 created_at 匹配（粗略），或直接标记最新的为当前
    // 这里简单标记最新的一条为 current
    const currentToken = req.headers.authorization.split(' ')[1];
    sessions.forEach(s => {
        s.current = (s.token === currentToken);
    });
    let currentSessionId = null;
    // 可以在插入时存储 token，但这里简单处理：通过 created_at 最新
    if (sessions.length > 0) {
      // 标记最新创建的为当前会话
      sessions[0].current = true;
      // 其他设为 false（默认）
      sessions.forEach((s, idx) => { if (idx !== 0) s.current = false; });
    }

    // 映射前端所需字段
    const mapped = sessions.map(s => ({
      id: s.id,
      device: s.device || 'Unknown Device',
      browser: s.browser || 'Unknown Browser',
      current: s.current || false,
      loggedOut: !s.is_active // 如果 is_active 为 false，表示已登出
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/sessions/:id/logout', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    if (userInfo.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    const { id } = req.params;

    // 验证该会话属于当前管理员
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('admin_sessions')
      .select('admin_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.admin_id !== userInfo.customer_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // 将 is_active 设为 false
    const { error: updateError } = await supabaseAdmin
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Session logged out.' });
  } catch (err) {
    console.error('Error logging out session:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/logout-all', async (req, res) => {
  try {
    const userInfo = await getUserInfo(req);
    if (userInfo.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });

    // 增加版本号
    const { data: admin } = await supabaseAdmin.from('admin').select('session_version').eq('admin_id', userInfo.customer_id).maybeSingle();
    await supabaseAdmin.from('admin').update({ session_version: (admin.session_version || 1) + 1 }).eq('admin_id', userInfo.customer_id);

    // 标记所有该管理员的会话为 inactive
    await supabaseAdmin
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('admin_id', userInfo.customer_id);

    res.json({ success: true, message: 'All sessions logged out.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================================================================ ✅ TAMBAH BARU
// ========== 12. DELETE CUSTOMER WITH EMAIL ==========
// ================================================================

// API: INITIATE CUSTOMER DELETION (Admin)
app.post('/api/customers/:customerId/delete-request', async (req, res) => {
    try {
        const { customerId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: customer, error: customerError } = await supabaseAdmin
            .from('customer')
          .select('customer_id, full_name, email, phone_number, delete_token, delete_token_expiry')
            .eq('customer_id', customerId)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Check if customer already has pending deletion
        if (customer.delete_token && customer.delete_token_expiry && new Date(customer.delete_token_expiry) > new Date()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer already has a pending deletion request. They need to click the link in their email.' 
            });
        }

        // Generate unique delete token
        const deleteToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 7);

        // Update customer with deletion token
        const { error: updateError } = await supabaseAdmin
            .from('customer')
            .update({
                delete_token: deleteToken,
                delete_token_expiry: tokenExpiry.toISOString()
            })
            .eq('customer_id', customerId);

        if (updateError) {
            throw updateError;
        }

        // Send email to customer
        const emailSent = await sendDeleteConfirmationEmail(
            customer.email,
            customer.full_name,
            deleteToken
        );

        if (!emailSent) {
            // Revert status if email fails
            await supabaseAdmin
                .from('customer')
                .update({
                    delete_token: null,
                    delete_token_expiry: null
                })
                .eq('customer_id', customerId);
                
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to send deletion email. Please try again.' 
            });
        }

        res.json({
            success: true,
            message: `Deletion request sent to ${customer.full_name}. They will receive an email to confirm.`,
            data: {
                customer_id: customer.customer_id,
                email: customer.email,
                status: 'pending_deletion'
            }
        });

    } catch (error) {
        console.error('Error initiating deletion:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// API: DIRECT DELETE ACCOUNT (Customer clicks link in email)
app.get('/api/delete-account', async (req, res) => {
    try {
        const { token, email } = req.query;

        if (!token || !email) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Invalid Request</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ Invalid Request</h1>
                    <p>Missing required parameters. Please use the link from your email.</p>
                    <a href="/">Back to Home</a>
                </body>
                </html>
            `);
        }

        // Find customer with matching token and email
        const { data: customer, error: customerError } = await supabaseAdmin
            .from('customer')
            .select('customer_id, full_name, email, delete_token, delete_token_expiry, status')
            .eq('email', email)
            .eq('delete_token', token)
            .single();

        if (customerError || !customer) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ Invalid Link</h1>
                    <p>The deletion link is invalid or has expired.</p>
                    <a href="/">Back to Home</a>
                </body>
                </html>
            `);
        }

        // Check token expiry
        const expiryDate = new Date(customer.delete_token_expiry);
        if (new Date() > expiryDate) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Link Expired</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>⏳ Link Expired</h1>
                    <p>The deletion link has expired. Please request a new one from the admin.</p>
                    <a href="/">Back to Home</a>
                </body>
                </html>
            `);
        }

        // Check if already deleted
        if (customer.status === 'deleted') {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Already Deleted</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>✅ Already Deleted</h1>
                    <p>This account has already been deleted.</p>
                    <a href="/">Back to Home</a>
                </body>
                </html>
            `);
        }

        const customerName = customer.full_name;
        const customerId = customer.customer_id;
        const customerEmail = customer.email;

        // ============================================================
        // DELETE ALL CUSTOMER DATA
        // ============================================================

        // 1. Delete bookings
        await supabaseAdmin
            .from('booking')
            .delete()
            .eq('customer_id', customerId);

        // 2. Delete pets
        await supabaseAdmin
            .from('pet')
            .delete()
            .eq('customer_id', customerId);

        // 3. Delete reviews
        await supabaseAdmin
            .from('review')
            .delete()
            .eq('customer_id', customerId);

        // 4. Delete customer
        const { error: deleteError } = await supabaseAdmin
            .from('customer')
            .delete()
            .eq('customer_id', customerId);

        if (deleteError) {
            throw deleteError;
        }

        // Send confirmation email
        await sendDeletionConfirmedEmail(customerEmail, customerName);

        // Show success page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Account Deleted - PawCare</title>
                <style>
                    body { font-family: 'Arial', sans-serif; background: #f5f0eb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                    .container { max-width: 480px; background: #ffffff; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                    .icon { font-size: 72px; margin-bottom: 16px; }
                    h1 { color: #2E7D32; margin-bottom: 8px; }
                    p { color: #555; line-height: 1.6; }
                    .btn { display: inline-block; padding: 12px 32px; background: #5a361a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px; }
                    .btn:hover { background: #402410; }
                    .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">✅</div>
                    <h1>Account Deleted</h1>
                    <p>Your PawCare account has been <strong>successfully deleted</strong>.</p>
                    <p style="font-size: 14px; color: #7a7a7a;">
                        A confirmation email has been sent to your registered email address.
                    </p>
                    <a href="/" class="btn">🏠 Back to Home</a>
                    <div class="footer">
                        <p>© 2026 PawCare Booking System — Paw Walker Grooming House</p>
                    </div>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Something Went Wrong</h1>
                <p>We encountered an error while processing your request.</p>
                <p style="color: #7a7a7a;">Please try again or contact support.</p>
                <a href="/">Back to Home</a>
            </body>
            </html>
        `);
    }
});

// 🆕 TAMBAHAN: ========== ADMIN CUSTOMER MANAGEMENT ==========
app.get('/api/admin/customers', isAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('customer')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: bookings, error: bookingError } = await supabaseAdmin
          .from('booking')
          .select('customer_id, status');
        if (bookingError) throw bookingError;

        const bookingCounts = {};
        (bookings || []).forEach(booking => {
          const customerId = String(booking.customer_id || '').trim();
          if (!customerId) return;
          if (!bookingCounts[customerId]) {
            bookingCounts[customerId] = { total: 0, completed: 0, cancelled: 0 };
          }
          bookingCounts[customerId].total += 1;
          if (booking.status === 'completed') bookingCounts[customerId].completed += 1;
          if (booking.status === 'cancelled') bookingCounts[customerId].cancelled += 1;
        });

        const customers = data.map(customer => {
          const counts = bookingCounts[String(customer.customer_id).trim()] || { total: 0, completed: 0, cancelled: 0 };
          return {
            ...customer,
            booking_count: counts.total,
            completed_booking_count: counts.completed,
            cancelled_booking_count: counts.cancelled
          };
        });

        res.json({ success: true, data: customers });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/customers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('customer')
            .select('*')
            .eq('customer_id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/customers/stats', isAdmin, async (req, res) => {
  try {
    const { count: total, error: totalError } = await supabaseAdmin
      .from('customer')
      .select('*', { count: 'exact', head: true });
    if (totalError) throw totalError;

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth, error: monthError } = await supabaseAdmin
      .from('customer')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());
    if (monthError) throw monthError;

    res.json({
      success: true,
      data: {
        total: total || 0,
        active: total || 0,
        inactive: 0,
        newThisMonth: newThisMonth || 0
      }
    });
  } catch (err) {
    console.error('Error fetching customer stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/customers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone_number, address, status } = req.body;

        const updateData = {
            full_name,
            email,
            phone_number,
            address: address || null,
            status: status || 'Active'
        };
        const { data, error } = await supabaseAdmin
            .from('customer')
            .update(updateData)
            .eq('customer_id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error updating customer:', err);
      res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/customers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: customer, error: checkError } = await supabaseAdmin
            .from('customer')
            .select('full_name')
            .eq('customer_id', id)
            .single();
        
        if (checkError || !customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        await supabaseAdmin.from('booking').delete().eq('customer_id', id);
        await supabaseAdmin.from('pet').delete().eq('customer_id', id);
        await supabaseAdmin.from('review').delete().eq('customer_id', id);
        
        const { error } = await supabaseAdmin
            .from('customer')
            .delete()
            .eq('customer_id', id);
        
        if (error) throw error;
        res.json({ success: true, message: `Customer deleted successfully` });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/customers/:id/bookings', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('booking')
            .select(`
                booking_id,
                customer_id,
                pet_id,
                booking_date,
                booking_time,
                status,
                pet:pet_id(pet_name, breed, species),
                booking_service(
                    service_id,
                    estimated_price,
                    service:service_id(service_name)
                )
            `)
            .eq('customer_id', id)
            .order('booking_date', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching customer bookings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🆕 TAMBAHAN: ========== ADMIN BOOKING MANAGEMENT ==========
app.get('/api/admin/bookings', isAdmin, async (req, res) => {
    try {
        const { status, start_date, end_date, search } = req.query;
        
        let query = supabaseAdmin
            .from('booking')
            .select(`
                booking_id,
              customer_id,
              pet_id,
                booking_date,
                booking_time,
                status,
                special_notes,
                reschedule_status,
                reschedule_requested_date,
                reschedule_requested_time,
                customer:customer_id(full_name, email, phone_number),
                pet:pet_id(pet_name, breed, species, pet_photo),
                booking_service(
                    service_id,
                    estimated_price,
                    service:service_id(service_name, category)
                )
            `)
            .order('booking_date', { ascending: false });

        if (status && status !== 'all') query = query.eq('status', status);
        if (start_date) query = query.gte('booking_date', start_date);
        if (end_date) query = query.lte('booking_date', end_date);
        if (search) {
            const { data: customers } = await supabaseAdmin
                .from('customer')
                .select('customer_id')
                .ilike('full_name', `%${search}%`);
            
            const customerIds = customers.map(c => c.customer_id);
            
            const { data: pets } = await supabaseAdmin
                .from('pet')
                .select('pet_id')
                .ilike('pet_name', `%${search}%`);
            
            const petIds = pets.map(p => p.pet_id);
            
            if (customerIds.length > 0 || petIds.length > 0) {
                let orConditions = [`booking_id.ilike.%${search}%`];
                if (customerIds.length > 0) orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
                if (petIds.length > 0) orConditions.push(`pet_id.in.(${petIds.join(',')})`);
                query = query.or(orConditions.join(','));
            } else {
                query = query.ilike('booking_id', `%${search}%`);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        const bookings = data.map(b => ({
            booking_id: b.booking_id,
            customer_id: b.customer_id,
            pet_id: b.pet_id,
            booking_date: b.booking_date,
            booking_time: b.booking_time,
            status: b.status,
            reschedule_status: b.reschedule_status || 'none',
            reschedule_requested_date: b.reschedule_requested_date,
            reschedule_requested_time: b.reschedule_requested_time,
            special_notes: b.special_notes,
            total_price: (b.booking_service || []).reduce((sum, s) => sum + (s.estimated_price || 0), 0),
            customer: b.customer ? {
                full_name: b.customer.full_name,
                email: b.customer.email,
                phone_number: b.customer.phone_number
            } : null,
            pet: b.pet ? {
                name: b.pet.pet_name,
                breed: b.pet.breed,
                species: b.pet.species,
                photo_url: b.pet.pet_photo
            } : null,
            services: (b.booking_service || []).map(s => ({
                service_id: s.service_id,
                service_name: s.service?.service_name,
                category: s.service?.category,
                estimated_price: s.estimated_price
            }))
        }));

        res.json({ success: true, data: bookings });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/admin/bookings/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_status, reschedule_status } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (status) updateData.status = status;
        if (payment_status) updateData.payment_status = payment_status;
        if (reschedule_status) updateData.reschedule_status = reschedule_status;

        if (reschedule_status === 'approved') {
            const { data: booking } = await supabaseAdmin
                .from('booking')
                .select('reschedule_requested_date, reschedule_requested_time')
                .eq('booking_id', id)
                .single();
            
            if (booking) {
                updateData.booking_date = booking.reschedule_requested_date;
                updateData.booking_time = booking.reschedule_requested_time;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('booking')
            .update(updateData)
            .eq('booking_id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error updating booking:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/bookings/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await supabaseAdmin.from('booking_service').delete().eq('booking_id', id);
        
        const { error } = await supabaseAdmin
            .from('booking')
            .delete()
            .eq('booking_id', id);
        
        if (error) throw error;
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/bookings/stats', isAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('booking')
            .select('status');

        if (error) throw error;

        const stats = {
            total: data.length,
            pending: data.filter(b => b.status === 'pending').length,
            confirmed: data.filter(b => b.status === 'confirmed').length,
            completed: data.filter(b => b.status === 'completed').length,
            cancelled: data.filter(b => b.status === 'cancelled').length,
            upcoming: data.filter(b => b.status === 'upcoming').length
        };

        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('Error fetching booking stats:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/admin/bookings/:id/reschedule', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('booking')
            .select('reschedule_status, reschedule_requested_date, reschedule_requested_time')
            .eq('booking_id', id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.reschedule_status !== 'pending') {
            return res.status(400).json({ success: false, message: 'No pending reschedule request' });
        }

        let updateData;
        if (action === 'approve') {
            updateData = {
                booking_date: booking.reschedule_requested_date,
                booking_time: booking.reschedule_requested_time,
                reschedule_status: 'approved',
                status: 'upcoming'
            };
        } else {
            updateData = { reschedule_status: 'rejected' };
        }

        const { error: updateError } = await supabaseAdmin
            .from('booking')
            .update(updateData)
            .eq('booking_id', id);

        if (updateError) throw updateError;
        res.json({ success: true, message: `Reschedule ${action === 'approve' ? 'approved' : 'rejected'}` });
    } catch (err) {
        console.error('Error processing reschedule:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🆕 TAMBAHAN: ========== ADMIN PET MANAGEMENT ==========
app.get('/api/admin/pets', isAdmin, async (req, res) => {
    try {
        const { species, status, search } = req.query;
        
        let query = supabaseAdmin
          .from('pet')
          .select('*')
          .order('pet_id', { ascending: true });

        if (species && species !== 'all') query = query.eq('species', species);
        if (search) query = query.or(`pet_name.ilike.%${search}%,breed.ilike.%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        const customerIds = [...new Set(data.map(pet => pet.customer_id).filter(Boolean))];
        let customersById = {};
        if (customerIds.length > 0) {
          const { data: customers, error: customerError } = await supabaseAdmin
            .from('customer')
            .select('customer_id, full_name, email, phone_number')
            .in('customer_id', customerIds);

          if (customerError) throw customerError;
          customersById = Object.fromEntries(
            customers.map(customer => [customer.customer_id, customer])
          );
        }

        const pets = data.map(pet => ({
            pet_id: pet.pet_id,
            pet_name: pet.pet_name,
          customer_id: pet.customer_id,
            species: pet.species,
            breed: pet.breed,
            date_of_birth: pet.date_of_birth,
            gender: pet.gender,
            weight: pet.weight,
            special_notes: pet.special_notes,
            pet_photo: pet.pet_photo,
            customer: customersById[pet.customer_id] ? {
              full_name: customersById[pet.customer_id].full_name,
              email: customersById[pet.customer_id].email,
              phone_number: customersById[pet.customer_id].phone_number
            } : null
        }));

        res.json({ success: true, data: pets });
    } catch (err) {
        console.error('Error fetching pets:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

  app.post('/api/admin/pets', isAdmin, async (req, res) => {
    try {
      const {
        name,
        customer_id,
        species,
        breed,
        dob,
        gender,
        weight,
        notes,
        photo_url
      } = req.body;

      if (!customer_id || !name || !species || !breed || !dob || !gender || weight === undefined || weight === null) {
        return res.status(400).json({ success: false, message: 'Required pet fields are missing.' });
      }

      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customer')
        .select('customer_id')
        .eq('customer_id', customer_id)
        .maybeSingle();
      if (customerError) throw customerError;
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

      const { data, error } = await supabaseAdmin
        .from('pet')
        .insert([{
          customer_id,
          pet_name: name,
          species: String(species).toLowerCase(),
          breed,
          date_of_birth: dob,
          gender,
          weight: Number(weight),
          special_notes: notes || null,
          pet_photo: photo_url || null
        }])
        .select('*')
        .single();
      if (error) throw error;

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Error creating pet:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/admin/pets/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, customer_id, species, breed, dob, gender, weight, notes, photo_url } = req.body;
      const updateData = {
        pet_name: name,
        customer_id,
        species: String(species).toLowerCase(),
        breed,
        date_of_birth: dob,
        gender,
        weight: Number(weight),
        special_notes: notes || null,
        pet_photo: photo_url || null
      };

      const { data, error } = await supabaseAdmin
        .from('pet')
        .update(updateData)
        .eq('pet_id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Pet not found.' });

      res.json({ success: true, data });
    } catch (err) {
      console.error('Error updating pet:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/admin/pets/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: bookings, error: bookingError } = await supabaseAdmin
        .from('booking')
        .select('booking_id')
        .eq('pet_id', id);
      if (bookingError) throw bookingError;
      const bookingIds = (bookings || []).map(booking => booking.booking_id);
      if (bookingIds.length > 0) {
        const { error: bookingServiceError } = await supabaseAdmin
          .from('booking_service')
          .delete()
          .in('booking_id', bookingIds);
        if (bookingServiceError) throw bookingServiceError;

        const { error: deleteBookingsError } = await supabaseAdmin
          .from('booking')
          .delete()
          .in('booking_id', bookingIds);
        if (deleteBookingsError) throw deleteBookingsError;
      }

      const { data, error } = await supabaseAdmin
        .from('pet')
        .delete()
        .eq('pet_id', id)
        .select('pet_id')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Pet not found.' });

      res.json({ success: true, message: 'Pet deleted.' });
    } catch (err) {
      console.error('Error deleting pet:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

app.get('/api/admin/pets/stats', isAdmin, async (req, res) => {
    try {
        const { count: total } = await supabaseAdmin
            .from('pet')
            .select('*', { count: 'exact', head: true });
        
        const { count: dogs } = await supabaseAdmin
            .from('pet')
            .select('*', { count: 'exact', head: true })
            .eq('species', 'dog');
        
        const { count: cats } = await supabaseAdmin
            .from('pet')
            .select('*', { count: 'exact', head: true })
            .eq('species', 'cat');

        res.json({
            success: true,
            data: {
                total: total || 0,
                dogs: dogs || 0,
                cats: cats || 0
            }
        });
    } catch (err) {
        console.error('Error fetching pet stats:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== Admin Profile Activity Stats ==========
app.get('/api/admin/profile/activity', isAdmin, async (req, res) => {
    try {
        const adminId = req.user.customer_id; // 来自 isAdmin 中间件设置的 req.user

        // 查询会话总数（登录次数）和最后登录时间
        const { data: sessions, error: sessionError } = await supabaseAdmin
            .from('admin_sessions')
            .select('created_at')
            .eq('admin_id', adminId)
            .order('created_at', { ascending: false });

        if (sessionError) throw sessionError;

        const totalLogins = sessions.length;
        const lastLogin = sessions.length > 0 ? sessions[0].created_at : null;

        // 查询管理员信息（含密码修改时间、资料修改时间）
        const { data: admin, error: adminError } = await supabaseAdmin
            .from('admin')
          .select('password_updated_at, profile_updated_at, last_login')
            .eq('admin_id', adminId)
            .maybeSingle();

        if (adminError) throw adminError;

        // 计算活跃天数（从首次登录到今天）
        let daysActive = 0;
        if (sessions.length > 0) {
          const firstLogin = new Date(sessions[sessions.length - 1].created_at);
            const now = new Date();
            const diffTime = Math.abs(now - firstLogin);
            daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // 安全分数（模拟，可改为实际规则）
        const securityScore = 98;

        // 返回数据
        res.json({
            success: true,
            data: {
                totalLogins,
                lastLogin: lastLogin || admin?.last_login || null,
                passwordUpdatedAt: admin?.password_updated_at || null,
                profileUpdatedAt: admin?.profile_updated_at || null,
                daysActive,
                securityScore,
                // 也可返回 firstLogin 用于其他用途
            }
        });
    } catch (err) {
        console.error('Error fetching admin activity:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
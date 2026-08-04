require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const emailjs = require('@emailjs/nodejs');
const path = require('path');

const app = express();

// ===== 增加请求体大小限制（解决 PayloadTooLargeError）=====
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 托管静态文件
app.use(express.static(path.join(__dirname, '.')));

// ========== Supabase 初始化 ==========
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ========== 辅助：从 Token 获取 customer_id ==========
const getCustomerId = (req) => {
    const auth = req.headers.authorization;
    if (!auth) throw new Error('No token');
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.customer_id;
};

// ========== 1. 注册 ==========
app.post('/api/register', async (req, res) => {
    try {
        const { full_name, email, password, phone_number, address } = req.body;
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
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 2. 登录 ==========
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: customer, error } = await supabase
            .from('customer')
            .select('customer_id, full_name, email, password')
            .eq('email', email)
            .maybeSingle();
        if (!customer) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        const match = await bcrypt.compare(password, customer.password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        const token = jwt.sign(
            { customer_id: customer.customer_id, email: customer.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            success: true,
            token,
            customer: { id: customer.customer_id, name: customer.full_name, email: customer.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 3. 获取个人资料 ==========
app.get('/api/profile', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { data, error } = await supabase
            .from('customer')
            .select('customer_id, full_name, email, phone_number, address, created_at')
            .eq('customer_id', customer_id)
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(401).json({ success: false, message: err.message });
    }
});

// ========== 4. 更新个人资料 ==========
app.put('/api/profile', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { phone_number, address } = req.body;
        const { error } = await supabase
            .from('customer')
            .update({ phone_number, address })
            .eq('customer_id', customer_id);
        if (error) throw error;
        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 5. 宠物 CRUD（适配你的表结构）==========
app.get('/api/pets', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { data, error } = await supabase
            .from('pet')
            .select('*')
            .eq('customer_id', customer_id)
            .order('pet_id', { ascending: false });  // 用 pet_id 排序，因为 created_at 不存在
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/pets', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        // 字段名映射：前端发送的 → 数据库字段
        const { name, breed, dob, gender, weight, notes, photo_url } = req.body;
        const { data, error } = await supabase
            .from('pet')
            .insert([{
                customer_id,
                pet_name: name,           // name → pet_name
                breed,
                date_of_birth: dob,       // dob → date_of_birth
                gender,
                weight,
                special_notes: notes,     // notes → special_notes
                pet_photo: photo_url      // photo_url → pet_photo
            }])
            .select('*');
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/pets/:pet_id', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { pet_id } = req.params;
        const { name, breed, dob, gender, weight, notes, photo_url } = req.body;
        const { error } = await supabase
            .from('pet')
            .update({
                pet_name: name,
                breed,
                date_of_birth: dob,
                gender,
                weight,
                special_notes: notes,
                pet_photo: photo_url
            })
            .eq('pet_id', pet_id)
            .eq('customer_id', customer_id);
        if (error) throw error;
        res.json({ success: true, message: 'Pet updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/pets/:pet_id', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { pet_id } = req.params;
        const { error } = await supabase
            .from('pet')
            .delete()
            .eq('pet_id', pet_id)
            .eq('customer_id', customer_id);
        if (error) throw error;
        res.json({ success: true, message: 'Pet deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 6. 预约 ==========
app.get('/api/bookings', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { data, error } = await supabase
            .from('booking')
            .select('*, pet:pet_id (pet_name, breed)')
            .eq('customer_id', customer_id)
            .order('booking_date', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { pet_id, service_type, booking_date, booking_time, check_in_date, check_out_date, total_price, special_notes } = req.body;
        const { data, error } = await supabase
            .from('booking')
            .insert([{
                customer_id,
                pet_id,
                service_type,
                booking_date,
                booking_time,
                check_in_date,
                check_out_date,
                total_price,
                special_notes,
                status: 'pending'
            }])
            .select('*');
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/bookings/:booking_id/cancel', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { booking_id } = req.params;
        const { error } = await supabase
            .from('booking')
            .update({ status: 'cancelled' })
            .eq('booking_id', booking_id)
            .eq('customer_id', customer_id);
        if (error) throw error;
        res.json({ success: true, message: 'Booking cancelled.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========== 7. 评价 ==========
app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('review')
            .select('*, customer:customer_id (full_name)')
            .order('review_date', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const customer_id = getCustomerId(req);
        const { booking_id, rating, comment, service_type } = req.body;
        const { data, error } = await supabase
            .from('review')
            .insert([{
                customer_id,
                booking_id,
                rating,
                comment,
                service_type
            }])
            .select('*');
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// =========================================================
// OTP 相关
// =========================================================
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const otpStore = new Map();

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    console.log(`📧 收到 OTP 发送请求: ${email}`);

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });
    console.log(`💾 已存储 OTP: ${otp}`);

    emailjs.init({
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
    });

    const templateParams = {
        otp_code: otp,
        email: email,
    };

    try {
        const response = await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            templateParams
        );
        console.log(`✅ EmailJS 发送成功: ${response.status}`);
        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('❌ EmailJS 错误:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP: ' + (error.text || error.message) });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    console.log('🔍 重置尝试:', { email, otp });

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const stored = otpStore.get(email);
    if (!stored) {
        return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (stored.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('customer')
            .update({ password: hashedPassword })
            .eq('email', email);

        if (error) {
            console.error('❌ 数据库更新失败:', error);
            return res.status(500).json({ success: false, message: 'Failed to update password in database.' });
        }

        otpStore.delete(email);
        console.log(`✅ 密码重置成功: ${email}`);
        res.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        console.error('❌ 重置密码错误:', err);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
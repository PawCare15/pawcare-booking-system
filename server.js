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

const app = express();

// ===== 配置 =====
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 安全托管静态文件
app.use(express.static(__dirname));

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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ========== 辅助函数 ==========
const getCustomerId = (req) => {
  const auth = req.headers.authorization;
  if (!auth) throw new Error('No token');
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded.customer_id;
};

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
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 3. 获取个人资料 ==========
app.get('/api/profile', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { data, error } = await supabase
      .from('customer')
      .select('customer_id, full_name, email, phone_number, address, profile_photo')
      .eq('customer_id', customer_id)
      .single();
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
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 5. 上传头像 ==========
app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${customer_id}_${Date.now()}.${fileExt}`;
    const filePath = `profile_photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile_photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('profile_photos')
      .getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('customer')
      .update({ profile_photo: avatarUrl })
      .eq('customer_id', customer_id);
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
    const customer_id = getCustomerId(req);
    const { currentPassword, newPassword } = req.body;

    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password does not meet complexity requirements.' });
    }

    const { data: user, error: fetchError } = await supabase
      .from('customer')
      .select('password')
      .eq('customer_id', customer_id)
      .single();
    if (fetchError || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('customer')
      .update({ password: hashed })
      .eq('customer_id', customer_id);
    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 7. 宠物 CRUD ==========
app.get('/api/pets', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { data, error } = await supabaseAdmin
      .from('pet')
      .select('*')
      .eq('customer_id', customer_id)
      .order('pet_id', { ascending: false });
    if (error) throw error;
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
    const customer_id = getCustomerId(req);
    const { name, breed, dob, gender, weight, notes, photo_url, species } = req.body;
    const { data, error } = await supabaseAdmin
      .from('pet')
      .insert([{
        customer_id,
        pet_name: name,
        breed,
        date_of_birth: dob,
        gender,
        weight,
        special_notes: notes,
        pet_photo: photo_url,
        species: species || 'dog'
      }])
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
    const customer_id = getCustomerId(req);
    const { pet_id } = req.params;
    const { name, breed, dob, gender, weight, notes, photo_url, species } = req.body;
    const { error } = await supabaseAdmin
      .from('pet')
      .update({
        pet_name: name,
        breed,
        date_of_birth: dob,
        gender,
        weight,
        special_notes: notes,
        pet_photo: photo_url,
        species
      })
      .eq('pet_id', pet_id)
      .eq('customer_id', customer_id);
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
    const customer_id = getCustomerId(req);
    const { pet_id } = req.params;

    const { data: bookings, error: checkError } = await supabaseAdmin
      .from('booking')
      .select('booking_id')
      .eq('pet_id', pet_id)
      .in('status', ['pending', 'upcoming']);
    if (checkError) throw checkError;
    if (bookings && bookings.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete pet with pending or upcoming bookings.' });
    }

    const { error } = await supabaseAdmin
      .from('pet')
      .delete()
      .eq('pet_id', pet_id)
      .eq('customer_id', customer_id);
    if (error) throw error;
    res.json({ success: true, message: 'Pet deleted.' });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
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

// ========== 9. 预约 CRUD ==========
app.get('/api/bookings', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { data, error } = await supabaseAdmin
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
      .eq('customer_id', customer_id)
      .order('booking_date', { ascending: false });
    if (error) throw error;

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
          photo_url: b.pet.pet_photo   // 新增，用于显示宠物照片
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

// ========== 10. 评价 ==========
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
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
        customer:customer_id (full_name),
        service:service_id (service_name)
      `)
      .order('review_date', { ascending: false });
    if (error) throw error;
    const mapped = data.map(r => ({
      review_id: r.review_id,
      booking_id: r.booking_id,
      customer_id: r.customer_id,
      service_id: r.service_id,
      rating: r.rating,
      comment: r.comment,
      review_photo: r.review_photo,
      created_at: r.review_date,
      customer: r.customer ? { full_name: r.customer.full_name } : null,
      service_name: r.service?.service_name || null
    }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.post('/api/reviews', reviewUpload.single('review_photo'), async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
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

  // 验证邮箱是否已注册
  const { data: user, error: userError } = await supabase
    .from('customer')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (userError) {
    console.error(userError);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
  if (!user) {
    return res.status(404).json({ success: false, message: 'Email not registered.' });
  }

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
  // 👇 补充密码策略校验
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
  const { error: updateError } = await supabase
    .from('customer')
    .update({ password: hashed })
    .eq('email', email);
  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }

  await supabase.from('otp_codes').delete().eq('email', email);

  res.json({ success: true, message: 'Password reset successful.' });
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
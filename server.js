require('dotenv').config();
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
      .select('customer_id, full_name, email, phone_number, address, profile_photo, created_at')
      .eq('customer_id', customer_id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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

    const { data: bookings, error: checkError } = await supabase
      .from('booking')
      .select('booking_id')
      .eq('pet_id', pet_id)
      .in('status', ['pending', 'upcoming']);
    if (checkError) throw checkError;
    if (bookings && bookings.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete pet with pending or upcoming bookings.' });
    }

    const { error } = await supabase
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
    // 1. 获取所有服务
    const { data: services, error: svcError } = await supabase
      .from('service')
      .select('service_id, service_name, category, duration, description');
    if (svcError) throw svcError;

    // 2. 获取所有价格
    const { data: prices, error: priceError } = await supabase
      .from('service_price')
      .select('service_id, species, starting_price');
    if (priceError) throw priceError;

    // 3. 合并
    const result = services.map(svc => {
      const svcPrices = prices.filter(p => p.service_id === svc.service_id);
      const dogPrice = svcPrices.find(p => p.species === 'dog')?.starting_price || null;
      const catPrice = svcPrices.find(p => p.species === 'cat')?.starting_price || null;
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

    console.log('Services result:', result); // 打印查看
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
    const { data, error } = await supabase
      .from('booking')
      .select(`
        booking_id,
        booking_date,
        booking_time,
        check_in_datetime,  
        check_out_datetime,
        status,
        total_price,
        special_notes,
        pet:pet_id (pet_name, breed, species),
        booking_service (
          service_id,
          estimated_price,
          service:service_id (service_name, category)
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
        check_in_datetime: b.check_in_datetime,   // 👈 改成读取这个
        check_out_datetime: b.check_out_datetime,
        status: b.status,
        total_price: b.total_price,
        special_notes: b.special_notes,
        pet: b.pet ? {
          name: b.pet.pet_name,
          breed: b.pet.breed,
          species: b.pet.species
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
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { pet_id, service_ids, booking_date, booking_time, check_in_datetime, check_out_datetime, special_notes } = req.body;

    if (isThursday(booking_date)) {
      return res.status(400).json({ success: false, message: 'We are closed on Thursdays.' });
    }

    const { data: pet, error: petError } = await supabase
      .from('pet')
      .select('species, weight')
      .eq('pet_id', pet_id)
      .single();
    if (petError) throw petError;
    const species = pet.species || 'dog';

    const { data: services, error: svcError } = await supabase
      .from('service')
      .select('service_id, service_name, category')
      .in('service_id', service_ids);
    if (svcError) throw svcError;
    if (!services || services.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid services selected.' });
    }

    let total_price = 0;
    const bookingServices = [];
    for (const svc of services) {
      const { data: priceData, error: priceError } = await supabase
        .from('service_price')
        .select('starting_price')
        .eq('service_id', svc.service_id)
        .eq('species', species)
        .maybeSingle();
      if (priceError) throw priceError;
      let price = priceData ? priceData.starting_price : 0;

      if (svc.category === 'boarding' && check_in_datetime && check_out_datetime) {
        const nights = Math.ceil((new Date(check_out_datetime) - new Date(check_in_datetime)) / (1000*60*60*24));
        if (nights > 0) {
          price = price * nights;
        } else {
          price = 0;
        }
      }

      bookingServices.push({
        service_id: svc.service_id,
        estimated_price: price
      });
      total_price += price;
    }

    const { data: booking, error: insertError } = await supabase
      .from('booking')
      .insert([{
        customer_id,
        pet_id,
        booking_date,
        booking_time,
        check_in_datetime,   
        check_out_datetime,
        total_price,
        special_notes,
        status: 'pending'
      }])
      .select('booking_id')
      .single();
    if (insertError) throw insertError;
    const booking_id = booking.booking_id;

    const bookingServiceRecords = bookingServices.map(bs => ({
      booking_id,
      service_id: bs.service_id,
      estimated_price: bs.estimated_price
    }));
    const { error: bsError } = await supabase
      .from('booking_service')
      .insert(bookingServiceRecords);
    if (bsError) throw bsError;

    const { data: fullBooking, error: fetchError } = await supabase
      .from('booking')
      .select(`
        booking_id,
        booking_date,
        booking_time,
        check_in_datetime,   
        check_out_datetime,
        status,
        total_price,
        special_notes,
        pet:pet_id (pet_name, breed, species),
        booking_service (
          service_id,
          estimated_price,
          service:service_id (service_name, category)
        )
      `)
      .eq('booking_id', booking_id)
      .single();
    if (fetchError) throw fetchError;

    const result = {
      booking_id: fullBooking.booking_id,
      booking_date: fullBooking.booking_date,
      booking_time: fullBooking.booking_time,
      check_in_datetime: fullBooking.check_in_datetime,
      check_out_datetime: fullBooking.check_out_datetime,
      status: fullBooking.status,
      total_price: fullBooking.total_price,
      special_notes: fullBooking.special_notes,
      pet: fullBooking.pet ? {
        name: fullBooking.pet.pet_name,
        breed: fullBooking.pet.breed,
        species: fullBooking.pet.species
      } : null,
      services: fullBooking.booking_service.map(s => ({
        service_id: s.service_id,
        service_name: s.service?.service_name,
        category: s.service?.category,
        estimated_price: s.estimated_price
      }))
    };

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

app.put('/api/bookings/:booking_id/cancel', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id } = req.params;

    const { data: booking, error: fetchError } = await supabase
      .from('booking')
      .select('status')
      .eq('booking_id', booking_id)
      .eq('customer_id', customer_id)
      .single();
    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (booking.status !== 'pending' && booking.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Only pending or upcoming bookings can be cancelled.' });
    }

    const { error } = await supabase
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('booking_id', booking_id);
    if (error) throw error;
    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: isProduction ? 'Internal server error' : err.message });
  }
});

// ========== 10. 评价 ==========
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
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

app.post('/api/reviews', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id, service_id, rating, comment, review_photo } = req.body;

    const { data: booking, error: checkError } = await supabase
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

    const { data, error } = await supabase
      .from('review')
      .insert([{
        customer_id,
        booking_id,
        service_id: service_id || null,
        rating,
        comment,
        review_photo
      }])
      .select('*');
    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    console.error(err);
    // ==== 修改点：认证错误返回 401 ====
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
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
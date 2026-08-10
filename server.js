// ================================================================
// DEPENDENCIES
// ================================================================
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();

// ================================================================
// CONFIGURATION
// ================================================================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

// CORS - ALLOW FRONTEND PORTS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // ALLOW REQUESTS WITH NO ORIGIN (LIKE MOBILE APPS OR CURL)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // PREFLIGHT REQUESTS

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// SERVE STATIC FILES
app.use(express.static(__dirname));

// ================================================================
// SUPABASE INITIALIZATION
// ================================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
  console.error('❌ MISSING SUPABASE ENVIRONMENT VARIABLES!');
  console.error('Please set SUPABASE_URL, SUPABASE_KEY, and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'abJdx22WbEum3YRiOIHExGDXMYCdMPTHekzdGE0g968=';

console.log('✅ Supabase connected successfully!');
console.log(`📡 API base URL: ${supabaseUrl}`);

// ================================================================
// HELPER FUNCTIONS
// ================================================================

// EXTRACT CUSTOMER ID FROM JWT TOKEN
const getCustomerId = (req) => {
  const auth = req.headers.authorization;
  if (!auth) throw new Error('No token');
  const token = auth.split(' ')[1];
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded.customer_id;
};

// PASSWORD POLICY
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

// CHECK IF DATE IS THURSDAY (CLOSED)
function isThursday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 4;
}

// GENERATE UNIQUE ID
function generateId() {
  return crypto.randomUUID();
}

// MULTER UPLOAD CONFIG
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

// ================================================================
// 1. REGISTER
// ================================================================
app.post('/api/register', async (req, res) => {
  try {
    const { full_name, email, password, phone_number, address } = req.body;

    // VALIDATE PASSWORD
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-16 characters with at least 1 lowercase, 1 uppercase, 1 number, and 1 special character (!@#$%^&*)'
      });
    }

    // CHECK IF EMAIL EXISTS
    const { data: existing, error: checkError } = await supabase
      .from('customer')
      .select('customer_id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // HASH PASSWORD
    const hashed = await bcrypt.hash(password, 10);

    // INSERT CUSTOMER
    const { error: insertError } = await supabase
      .from('customer')
      .insert([{
        customer_id: generateId(),
        full_name,
        email,
        password: hashed,
        phone_number,
        address
      }]);

    if (insertError) throw insertError;

    res.status(201).json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 2. LOGIN
// ================================================================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // FIND CUSTOMER
    const { data: customer, error: findError } = await supabase
      .from('customer')
      .select('customer_id, full_name, email, password')
      .eq('email', email)
      .maybeSingle();

    if (findError) throw findError;
    if (!customer) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // VERIFY PASSWORD
    const match = await bcrypt.compare(password, customer.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // GENERATE JWT
    const token = jwt.sign(
      { customer_id: customer.customer_id, email: customer.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      customer: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 3. GET PROFILE
// ================================================================
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
    console.error('Get profile error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 4. UPDATE PROFILE
// ================================================================
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
    console.error('Update profile error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 5. UPLOAD AVATAR
// ================================================================
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

    // UPLOAD TO SUPABASE STORAGE
    const { error: uploadError } = await supabase.storage
      .from('profile_photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // GET PUBLIC URL
    const { data: urlData } = supabase.storage
      .from('profile_photos')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // UPDATE CUSTOMER PROFILE
    const { error: updateError } = await supabase
      .from('customer')
      .update({ profile_photo: avatarUrl })
      .eq('customer_id', customer_id);

    if (updateError) throw updateError;

    res.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 6. CHANGE PASSWORD
// ================================================================
app.put('/api/profile/password', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { currentPassword, newPassword } = req.body;

    // VALIDATE NEW PASSWORD
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-16 characters with at least 1 lowercase, 1 uppercase, 1 number, and 1 special character (!@#$%^&*)'
      });
    }

    // GET CURRENT PASSWORD
    const { data: user, error: fetchError } = await supabase
      .from('customer')
      .select('password')
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // VERIFY CURRENT PASSWORD
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    // HASH NEW PASSWORD
    const hashed = await bcrypt.hash(newPassword, 10);

    // UPDATE PASSWORD
    const { error: updateError } = await supabase
      .from('customer')
      .update({ password: hashed })
      .eq('customer_id', customer_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 7. PET CRUD
// ================================================================
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
    console.error('Get pets error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.post('/api/pets', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { name, breed, dob, gender, weight, notes, photo_url, species } = req.body;

    const { data, error } = await supabaseAdmin
      .from('pet')
      .insert([{
        pet_id: generateId(),
        customer_id,
        pet_name: name,
        breed,
        date_of_birth: dob,
        gender,
        weight: weight || 0,
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
    console.error('Create pet error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
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
        weight: weight || 0,
        special_notes: notes,
        pet_photo: photo_url,
        species
      })
      .eq('pet_id', pet_id)
      .eq('customer_id', customer_id);

    if (error) throw error;

    res.json({ success: true, message: 'Pet updated.' });
  } catch (err) {
    console.error('Update pet error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.delete('/api/pets/:pet_id', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { pet_id } = req.params;

    // CHECK FOR PENDING/UPCOMING BOOKINGS
    const { data: bookings, error: checkError } = await supabaseAdmin
      .from('booking')
      .select('booking_id')
      .eq('pet_id', pet_id)
      .in('status', ['pending', 'upcoming']);

    if (checkError) throw checkError;

    if (bookings && bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete pet with pending or upcoming bookings.'
      });
    }

    // DELETE PET
    const { error } = await supabaseAdmin
      .from('pet')
      .delete()
      .eq('pet_id', pet_id)
      .eq('customer_id', customer_id);

    if (error) throw error;

    res.json({ success: true, message: 'Pet deleted.' });
  } catch (err) {
    console.error('Delete pet error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 8. SERVICES LIST
// ================================================================
app.get('/api/services', async (req, res) => {
  try {
    // GET ALL SERVICES
    const { data: services, error: svcError } = await supabaseAdmin
      .from('service')
      .select('service_id, service_name, category, duration, description');

    if (svcError) throw svcError;

    // GET ALL PRICES
    const { data: prices, error: priceError } = await supabaseAdmin
      .from('service_price')
      .select('service_id, species, starting_price');

    if (priceError) throw priceError;

    // COMBINE DATA
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

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 9. BOOKINGS CRUD
// ================================================================
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
        check_in_datetime: b.check_in_datetime,
        check_out_datetime: b.check_out_datetime,
        status: b.status,
        total_price: services.reduce((sum, s) => sum + (s.estimated_price || 0), 0),
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
    console.error('Get bookings error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { pet_id, service_ids, booking_date, booking_time, check_in_datetime, check_out_datetime, special_notes } = req.body;

    // 1. 基础验证
    if (!pet_id) return res.status(400).json({ success: false, message: 'Pet is required.' });
    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one service is required.' });
    }
    if (!booking_date) return res.status(400).json({ success: false, message: 'Booking date is required.' });
    if (!booking_time) return res.status(400).json({ success: false, message: 'Booking time is required.' });

    // 2. 检查周四闭店（含寄养日期）
    if (isThursday(booking_date)) {
      return res.status(400).json({ success: false, message: 'We are closed on Thursdays.' });
    }
    if (check_in_datetime && isThursday(check_in_datetime)) {
      return res.status(400).json({ success: false, message: 'Check-in cannot be on Thursday (closed).' });
    }
    if (check_out_datetime && isThursday(check_out_datetime)) {
      return res.status(400).json({ success: false, message: 'Check-out cannot be on Thursday (closed).' });
    }

    // 3. 验证宠物归属（同时获取 species）
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pet')
      .select('species, weight')
      .eq('pet_id', pet_id)
      .eq('customer_id', customer_id)   // 重要：验证归属
      .single();
    if (petError) {
      return res.status(404).json({ success: false, message: 'Pet not found or does not belong to you.' });
    }
    const species = pet.species || 'dog';

    // 4. 检查重复预约
    const { data: existing, error: existError } = await supabaseAdmin
      .from('booking')
      .select('booking_id')
      .eq('pet_id', pet_id)
      .eq('booking_date', booking_date)
      .in('status', ['pending', 'upcoming']);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'This pet already has a booking on that date.' });
    }

    // 5. 获取服务信息并计算价格
    const { data: services, error: svcError } = await supabaseAdmin
      .from('service')
      .select('service_id, service_name, category')
      .in('service_id', service_ids);
    if (svcError || !services || services.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid services selected.' });
    }

    let total_price = 0;
    const bookingServices = [];

    for (const svc of services) {
      const { data: priceData, error: priceError } = await supabaseAdmin
        .from('service_price')
        .select('starting_price')
        .eq('service_id', svc.service_id)
        .eq('species', species)
        .maybeSingle();
      if (priceError) throw priceError;

      let price = priceData ? priceData.starting_price : 0;

      // 寄养特殊处理
      const categoryLower = (svc.category || '').toLowerCase();
      if (categoryLower === 'boarding') {
        if (!check_in_datetime || !check_out_datetime) {
          return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required for boarding.' });
        }
        const nights = Math.ceil((new Date(check_out_datetime) - new Date(check_in_datetime)) / (1000 * 60 * 60 * 24));
        if (nights < 1) {
          return res.status(400).json({ success: false, message: 'Check-out must be at least one day after check-in.' });
        }
        price = price * nights;
      }

      bookingServices.push({
        service_id: svc.service_id,
        estimated_price: price
      });
      total_price += price;
    }

    // 6. 插入 booking（注意：如果主键是自增整数，不要插入 booking_id）
    const bookingId = generateId(); // 仅当主键为 text 时使用
    const { data: booking, error: insertError } = await supabaseAdmin
      .from('booking')
      .insert([{
        booking_id: bookingId,   // 如果表自动生成，则省略此行
        customer_id,
        pet_id,
        booking_date,
        booking_time,
        check_in_datetime,
        check_out_datetime,
        special_notes,
        status: 'pending'
      }])
      .select('booking_id')
      .single();
    if (insertError) throw insertError;

    // 7. 插入 booking_service（注意主键）
    const bookingServiceRecords = bookingServices.map(bs => ({
      booking_id: bookingId,
      service_id: bs.service_id,
      estimated_price: bs.estimated_price
      // 如果表有单独的 booking_service_id 主键且自增，则不加；否则若为 text 则加 booking_service_id: generateId()
    }));

    const { error: bsError } = await supabaseAdmin
      .from('booking_service')
      .insert(bookingServiceRecords);
    if (bsError) throw bsError;

    // 8. 获取完整预约信息并返回
    const { data: fullBooking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select(`
        booking_id,
        booking_date,
        booking_time,
        check_in_datetime,
        check_out_datetime,
        status,
        special_notes,
        pet:pet_id (pet_name, breed, species),
        booking_service (
          service_id,
          estimated_price,
          service:service_id (service_name, category)
        )
      `)
      .eq('booking_id', bookingId)
      .single();
    if (fetchError) throw fetchError;

    const result = {
      booking_id: fullBooking.booking_id,
      booking_date: fullBooking.booking_date,
      booking_time: fullBooking.booking_time,
      check_in_datetime: fullBooking.check_in_datetime,
      check_out_datetime: fullBooking.check_out_datetime,
      status: fullBooking.status,
      total_price: (fullBooking.booking_service || []).reduce((sum, s) => sum + (s.estimated_price || 0), 0),
      special_notes: fullBooking.special_notes,
      pet: fullBooking.pet ? {
        name: fullBooking.pet.pet_name,
        breed: fullBooking.pet.breed,
        species: fullBooking.pet.species
      } : null,
      services: (fullBooking.booking_service || []).map(s => ({
        service_id: s.service_id,
        service_name: s.service?.service_name,
        category: s.service?.category,
        estimated_price: s.estimated_price
      }))
    };

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Create booking error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.put('/api/bookings/:booking_id/cancel', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id } = req.params;

    // CHECK BOOKING EXISTS AND BELONGS TO USER
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking')
      .select('status')
      .eq('booking_id', booking_id)
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // CHECK IF CANCELABLE
    if (booking.status !== 'pending' && booking.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Only pending or upcoming bookings can be cancelled.'
      });
    }

    // CANCEL BOOKING
    const { error } = await supabaseAdmin
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('booking_id', booking_id);

    if (error) throw error;

    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 10. REVIEWS
// ================================================================
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
    console.error('Get reviews error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const customer_id = getCustomerId(req);
    const { booking_id, service_id, rating, comment, review_photo } = req.body;

    // CHECK BOOKING EXISTS AND IS COMPLETED
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
        return res.status(400).json({
          success: false,
          message: 'Only completed bookings can be reviewed.'
        });
      }
    }

    // CREATE REVIEW
    const { data, error } = await supabaseAdmin
      .from('review')
      .insert([{
        review_id: generateId(),
        customer_id,
        booking_id: booking_id || null,
        service_id: service_id || null,
        rating,
        comment,
        review_photo
      }])
      .select('*');

    if (error) throw error;

    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    console.error('Create review error:', err);
    if (err.message === 'No token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// 11. OTP & RESET PASSWORD
// ================================================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required.' });
    }

    // CHECK EMAIL EXISTS
    const { data: user, error: userError } = await supabase
      .from('customer')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not registered.' });
    }

    // GENERATE OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // STORE OTP
    const { error: storeError } = await supabase
      .from('otp_codes')
      .upsert({ email, code: otp, expires_at: expiresAt }, { onConflict: 'email' });

    if (storeError) throw storeError;

    // SEND EMAIL VIA EMAILJS
    try {
      const emailjs = require('@emailjs/nodejs');
      emailjs.init({
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      });

      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        { otp_code: otp, email }
      );
    } catch (emailError) {
      console.error('EmailJS error:', emailError);
      // STILL RETURN SUCCESS SO USER KNOWS OTP WAS GENERATED
    }

    res.json({ success: true, message: 'OTP sent.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }

    // VALIDATE PASSWORD
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-16 characters with at least 1 lowercase, 1 uppercase, 1 number, and 1 special character (!@#$%^&*)'
      });
    }

    // VERIFY OTP
    const { data, error } = await supabase
      .from('otp_codes')
      .select('code, expires_at')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Request a new one.'
      });
    }

    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('email', email);
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }

    if (data.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // UPDATE PASSWORD
    const hashed = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('customer')
      .update({ password: hashed })
      .eq('email', email);

    if (updateError) throw updateError;

    // DELETE OTP
    await supabase.from('otp_codes').delete().eq('email', email);

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message
    });
  }
});

// ================================================================
// HEALTH CHECK
// ================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    supabase: supabaseUrl ? 'connected' : 'not configured'
  });
});

// ================================================================
// START SERVER
// ================================================================
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`🔄 Supabase: ${supabaseUrl}`);
  console.log('========================================');
});
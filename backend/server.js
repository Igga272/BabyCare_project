require('dotenv').config();

console.log('--- ENV CHECK ---');
console.log('PORT:', process.env.PORT || '(not set)');
console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', !!process.env.SUPABASE_KEY);
console.log('JWT_SECRET:', !!process.env.JWT_SECRET);
console.log('BREVO_API_KEY:', !!process.env.BREVO_API_KEY);
console.log('EMAIL_FROM:', !!process.env.EMAIL_FROM);
console.log('EMAIL_FROM_NAME:', !!process.env.EMAIL_FROM_NAME);
console.log('working directory:', process.cwd());
console.log('-----------------');

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorMiddleware');
const babyRoutes = require('./routes/babyRoutes');
const authRoutes = require('./routes/authRoutes');
const vaccineRoutes = require('./routes/vaccineRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const configRoutes = require('./routes/configRoutes');
const checkupRoutes = require('./routes/checkupRoutes');
const clinicStaffRoutes = require('./routes/clinicStaffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const growthRoutes = require('./routes/growthRoutes');
const newbornTestRoutes = require('./routes/newbornTestRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const feedingSleepRoutes = require('./routes/feedingSleepRoutes');
const babyRecordsRoutes = require('./routes/babyRecordsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BabyCare server is running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/babies', babyRoutes);
app.use('/api/vaccinations', vaccineRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/checkups', checkupRoutes);
app.use('/api/clinic-staff', clinicStaffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/newborn-tests', newbornTestRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/logs', feedingSleepRoutes);
app.use('/api/baby-records', babyRecordsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`BabyCare server running on http://localhost:${PORT}`);
});
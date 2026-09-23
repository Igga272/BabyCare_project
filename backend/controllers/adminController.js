const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function getDashboardStats(req, res, next) {
  try {
    const today = getTodayDate();

    const [todayAppts, pending, completed, upcomingVaccines] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed').eq('appointment_date', today),
      supabase.from('baby_vaccinations').select('id', { count: 'exact', head: true }).in('status', ['upcoming', 'due'])
    ]);

    res.status(200).json({
      success: true,
      message: 'Stats retrieved successfully',
      data: {
        todayAppointments: todayAppts.count || 0,
        pending: pending.count || 0,
        completedToday: completed.count || 0,
        upcomingVaccines: upcomingVaccines.count || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, clinic_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createClinicStaff(req, res, next) {
  try {
    const { email, password, full_name, clinic_id } = req.body;

    if (!email || !password || !full_name || !clinic_id) {
      const err = new Error('email, password, full_name, and clinic_id are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const err = new Error('Email already registered');
      err.statusCode = 400;
      return next(err);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash, role: 'clinic', clinic_id, full_name }])
      .select()
      .single();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: { id: data.id, email: data.email, clinic_id: data.clinic_id }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats, getAllUsers, createClinicStaff };

const supabase = require('../config/supabase');

const HOSPITAL_CLINIC_ID = 1;

async function getParentIdFromUser(userId) {
  const { data } = await supabase.from('parents').select('id').eq('user_id', userId).single();
  return data ? data.id : null;
}

async function verifyBabyOwnership(babyId, parentId) {
  const { data } = await supabase
    .from('babies')
    .select('id')
    .eq('id', babyId)
    .eq('parent_id', parentId)
    .single();
  return !!data;
}

async function getMyAppointments(req, res, next) {
  try {
    const parentId = await getParentIdFromUser(req.user.id);

    const { data: babies } = await supabase.from('babies').select('id').eq('parent_id', parentId);
    const babyIds = (babies || []).map((b) => b.id);

    if (babyIds.length === 0) {
      return res.status(200).json({ success: true, message: 'Appointments retrieved successfully', data: [] });
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*, babies(full_name), doctors(full_name), clinics(name, address)')
      .in('baby_id', babyIds)
      .order('appointment_date', { ascending: true });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const { baby_id, doctor_id, appointment_date, appointment_time, reason, notes } = req.body;

    if (!baby_id || !doctor_id || !appointment_date || !appointment_time) {
      const err = new Error('baby_id, doctor_id, appointment_date, and appointment_time are required');
      err.statusCode = 400;
      return next(err);
    }

    const parentId = await getParentIdFromUser(req.user.id);
    const isOwner = await verifyBabyOwnership(baby_id, parentId);

    if (!isOwner) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (conflict) {
      const err = new Error('This doctor is already booked at that date and time');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        baby_id, doctor_id, clinic_id: HOSPITAL_CLINIC_ID,
        appointment_date, appointment_time, reason, notes, status: 'pending'
      }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const parentId = await getParentIdFromUser(req.user.id);

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, babies(parent_id)')
      .eq('id', id)
      .single();

    if (!appointment || appointment.babies.parent_id !== parentId) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyAppointments, createAppointment, cancelAppointment };

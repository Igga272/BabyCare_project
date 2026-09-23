const supabase = require('../config/supabase');

function getClinicIdForUser(user) {
  return user.role === 'admin' ? 1 : user.clinic_id;
}

async function getClinicAppointments(req, res, next) {
  try {
    const clinicId = getClinicIdForUser(req.user);

    const { data, error } = await supabase
      .from('appointments')
      .select('*, babies(full_name, date_of_birth), doctors(full_name)')
      .eq('clinic_id', clinicId)
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

async function updateAppointmentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const clinicId = getClinicIdForUser(req.user);

    const allowedStatuses = ['confirmed', 'cancelled', 'completed', 'missed'];
    if (!allowedStatuses.includes(status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      return next(err);
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (!appointment) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: `Appointment marked as ${status}`,
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

async function deleteAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const clinicId = getClinicIdForUser(req.user);

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (!appointment) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      return next(err);
    }

    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function addCheckupForBaby(req, res, next) {
  try {
    const { baby_id, checkup_date, weight_kg, height_cm, head_circumference_cm, doctor_notes, appointment_id, doctor_id } = req.body;

    if (!baby_id || !checkup_date) {
      const err = new Error('baby_id and checkup_date are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('checkup_records')
      .insert([{
        baby_id, checkup_date, weight_kg, height_cm, head_circumference_cm,
        doctor_notes, appointment_id: appointment_id || null, doctor_id: doctor_id || null
      }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Checkup record added successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getClinicAppointments, updateAppointmentStatus, deleteAppointment, addCheckupForBaby };

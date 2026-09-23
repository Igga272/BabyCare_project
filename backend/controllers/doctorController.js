const supabase = require('../config/supabase');

async function getAllDoctors(req, res, next) {
  try {
    const { clinic_id } = req.query;

    let query = supabase.from('doctors').select('*, clinics(name)').order('full_name');

    if (clinic_id) {
      query = query.eq('clinic_id', clinic_id);
    }

    const { data, error } = await query;

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createDoctor(req, res, next) {
  try {
    const { full_name, specialization, clinic_id, status, available_days, available_time_start, available_time_end } = req.body;

    if (!full_name || !clinic_id) {
      const err = new Error('full_name and clinic_id are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('doctors')
      .insert([{
        full_name, specialization, clinic_id,
        status: status || 'available',
        available_days, available_time_start, available_time_end
      }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

async function updateDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, specialization, status, available_days, available_time_start, available_time_end } = req.body;

    const { data, error } = await supabase
      .from('doctors')
      .update({ full_name, specialization, status, available_days, available_time_start, available_time_end })
      .eq('id', id)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (data.length === 0) {
      const err = new Error('Doctor not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllDoctors, createDoctor, updateDoctor };

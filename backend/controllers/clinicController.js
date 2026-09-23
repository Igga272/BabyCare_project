const supabase = require('../config/supabase');

const HOSPITAL_CLINIC_ID = 1;

async function getAllClinics(req, res, next) {
  try {
    const { data, error } = await supabase.from('clinics').select('*').order('name');

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Clinics retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function getHospitalInfo(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', HOSPITAL_CLINIC_ID)
      .single();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Hospital info retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllClinics, getHospitalInfo };

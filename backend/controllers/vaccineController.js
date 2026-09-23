const supabase = require('../config/supabase');
const { calculateStatus } = require('../services/vaccineService');

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

async function getVaccineScheduleByBaby(req, res, next) {
  try {
    const { babyId } = req.params;

    if (req.user.role === 'parent') {
      const parentId = await getParentIdFromUser(req.user.id);
      const isOwner = await verifyBabyOwnership(babyId, parentId);
      if (!isOwner) {
        const err = new Error('Baby not found');
        err.statusCode = 404;
        return next(err);
      }
    }

    const { data, error } = await supabase
      .from('baby_vaccinations')
      .select('id, scheduled_date, status, completed_date, vaccines(name, description, dose_number)')
      .eq('baby_id', babyId)
      .order('scheduled_date', { ascending: true });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Vaccine schedule retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function markVaccineCompleted(req, res, next) {
  try {
    const { id } = req.params;
    const { completed_date } = req.body;

    if (!completed_date) {
      const err = new Error('completed_date is required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('baby_vaccinations')
      .update({ status: 'completed', completed_date })
      .eq('id', id)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (data.length === 0) {
      const err = new Error('Vaccination record not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Vaccine marked as completed',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
}

async function updateVaccinationSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { scheduled_date } = req.body;

    if (!scheduled_date) {
      const err = new Error('scheduled_date is required');
      err.statusCode = 400;
      return next(err);
    }

    if (!isValidDateString(scheduled_date)) {
      const err = new Error('scheduled_date must be a valid date in YYYY-MM-DD format');
      err.statusCode = 400;
      return next(err);
    }

    const { data: existing, error: existingError } = await supabase
      .from('baby_vaccinations')
      .select('id, status, completed_date')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      const err = new Error('Vaccination record not found');
      err.statusCode = 404;
      return next(err);
    }

    let finalStatus;
    let finalCompletedDate;

    if (existing.status === 'completed' && existing.completed_date) {
      finalStatus = 'completed';
      finalCompletedDate = existing.completed_date;
    } else {
      finalStatus = calculateStatus(scheduled_date);
      finalCompletedDate = null;
    }

    const { data, error } = await supabase
      .from('baby_vaccinations')
      .update({
        scheduled_date,
        status: finalStatus,
        completed_date: finalCompletedDate
      })
      .eq('id', id)
      .select('id, baby_id, scheduled_date, status, completed_date, vaccines(name, description, dose_number)');

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (data.length === 0) {
      const err = new Error('Vaccination record not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Vaccine schedule updated successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getVaccineScheduleByBaby, markVaccineCompleted, updateVaccinationSchedule };
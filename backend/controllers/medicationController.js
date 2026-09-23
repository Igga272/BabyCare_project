const supabase = require('../config/supabase');

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

async function getMedicationsByBaby(req, res, next) {
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
      .from('medications')
      .select('*, doctors(full_name)')
      .eq('baby_id', babyId)
      .order('start_date', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Medications retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createMedication(req, res, next) {
  try {
    const { baby_id, medicine_name, dosage, schedule_times, start_date, end_date, prescribed_by } = req.body;

    if (!baby_id || !medicine_name) {
      const err = new Error('baby_id and medicine_name are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('medications')
      .insert([{ baby_id, medicine_name, dosage, schedule_times, start_date, end_date, prescribed_by: prescribed_by || null }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

async function toggleReminder(req, res, next) {
  try {
    const { id } = req.params;
    const { reminder_on } = req.body;
    const parentId = await getParentIdFromUser(req.user.id);

    const { data: med } = await supabase
      .from('medications')
      .select('*, babies(parent_id)')
      .eq('id', id)
      .single();

    if (!med || med.babies.parent_id !== parentId) {
      const err = new Error('Medication not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase
      .from('medications')
      .update({ reminder_on })
      .eq('id', id)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Reminder updated',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMedicationsByBaby, createMedication, toggleReminder };

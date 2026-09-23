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

async function getGrowthRecords(req, res, next) {
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
      .from('growth_records')
      .select('*')
      .eq('baby_id', babyId)
      .order('record_date', { ascending: true });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Growth records retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createGrowthRecord(req, res, next) {
  try {
    const { baby_id, weight_kg, height_cm, head_circumference_cm, record_date, notes } = req.body;

    if (!baby_id || !record_date) {
      const err = new Error('baby_id and record_date are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('growth_records')
      .insert([{ baby_id, weight_kg, height_cm, head_circumference_cm, record_date, notes }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Growth record added successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGrowthRecords, createGrowthRecord };

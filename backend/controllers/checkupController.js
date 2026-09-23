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

async function getCheckupsByBaby(req, res, next) {
  try {
    const { babyId } = req.params;
    const parentId = await getParentIdFromUser(req.user.id);

    const isOwner = await verifyBabyOwnership(babyId, parentId);
    if (!isOwner) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase
      .from('checkup_records')
      .select('*, doctors(full_name)')
      .eq('baby_id', babyId)
      .order('checkup_date', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Checkup records retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCheckupsByBaby };

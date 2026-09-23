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

async function getTestsByBaby(req, res, next) {
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
      .from('newborn_tests')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Newborn tests retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createTest(req, res, next) {
  try {
    const { baby_id, test_type, date_conducted, result, notes } = req.body;

    if (!baby_id || !test_type) {
      const err = new Error('baby_id and test_type are required');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('newborn_tests')
      .insert([{
        baby_id, test_type, status: 'completed', date_conducted, result, notes,
        recorded_by: req.user.email
      }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Test result added successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTestsByBaby, createTest };

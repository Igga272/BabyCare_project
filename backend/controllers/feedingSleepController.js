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

async function getFeedingLogs(req, res, next) {
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
      .from('feeding_logs')
      .select('*')
      .eq('baby_id', babyId)
      .order('log_date', { ascending: false })
      .order('log_time', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({ success: true, message: 'Feeding logs retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createFeedingLog(req, res, next) {
  try {
    const { baby_id, log_date, log_time, feeding_type, notes } = req.body;

    if (!baby_id || !log_date || !log_time) {
      const err = new Error('baby_id, log_date, and log_time are required');
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

    const { data, error } = await supabase
      .from('feeding_logs')
      .insert([{ baby_id, log_date, log_time, feeding_type, notes }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({ success: true, message: 'Feeding logged', data: data[0] });
  } catch (err) {
    next(err);
  }
}

async function getSleepLogs(req, res, next) {
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
      .from('sleep_logs')
      .select('*')
      .eq('baby_id', babyId)
      .order('log_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({ success: true, message: 'Sleep logs retrieved', data });
  } catch (err) {
    next(err);
  }
}

async function createSleepLog(req, res, next) {
  try {
    const { baby_id, log_date, start_time, end_time, notes } = req.body;

    if (!baby_id || !log_date || !start_time) {
      const err = new Error('baby_id, log_date, and start_time are required');
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

    const { data, error } = await supabase
      .from('sleep_logs')
      .insert([{ baby_id, log_date, start_time, end_time: end_time || null, notes }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({ success: true, message: 'Sleep logged', data: data[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFeedingLogs, createFeedingLog, getSleepLogs, createSleepLog };

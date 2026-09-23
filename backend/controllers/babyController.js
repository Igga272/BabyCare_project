const supabase = require('../config/supabase');
const { generateVaccineSchedule } = require('../services/vaccineService');

async function getParentIdFromUser(userId) {
  const { data, error } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function getAllBabies(req, res, next) {
  try {
    const parentId = await getParentIdFromUser(req.user.id);

    if (!parentId) {
      const err = new Error('Parent profile not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase.from('babies').select('*').eq('parent_id', parentId);

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Babies retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function getBabyById(req, res, next) {
  try {
    const { id } = req.params;
    const parentId = await getParentIdFromUser(req.user.id);

    const { data, error } = await supabase
      .from('babies')
      .select('*')
      .eq('id', id)
      .eq('parent_id', parentId)
      .single();

    if (error || !data) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Baby retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createBaby(req, res, next) {
  try {
    const { full_name, date_of_birth, gender, birth_weight_kg, birth_height_cm, avatar_id } = req.body;

    if (!full_name || !date_of_birth || !gender) {
      const err = new Error('full_name, date_of_birth, and gender are required');
      err.statusCode = 400;
      return next(err);
    }

    const today = new Date().toISOString().split('T')[0];
    if (date_of_birth > today) {
      const err = new Error('date_of_birth cannot be in the future');
      err.statusCode = 400;
      return next(err);
    }

    const parentId = await getParentIdFromUser(req.user.id);

    if (!parentId) {
      const err = new Error('Parent profile not found');
      err.statusCode = 404;
      return next(err);
    }

    const { data, error } = await supabase
      .from('babies')
      .insert([{
        parent_id: parentId, full_name, date_of_birth, gender,
        birth_weight_kg, birth_height_cm, avatar_id: avatar_id || 1
      }])
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    const newBaby = data[0];

    await generateVaccineSchedule(newBaby.id, newBaby.date_of_birth);

    res.status(201).json({
      success: true,
      message: 'Baby created successfully and vaccine schedule generated',
      data: newBaby
    });
  } catch (err) {
    next(err);
  }
}

async function updateBaby(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, date_of_birth, gender, birth_weight_kg, birth_height_cm, avatar_id } = req.body;
    const parentId = await getParentIdFromUser(req.user.id);

    const today = new Date().toISOString().split('T')[0];
    if (date_of_birth && date_of_birth > today) {
      const err = new Error('date_of_birth cannot be in the future');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('babies')
      .update({ full_name, date_of_birth, gender, birth_weight_kg, birth_height_cm, avatar_id })
      .eq('id', id)
      .eq('parent_id', parentId)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (data.length === 0) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Baby updated successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

async function deleteBaby(req, res, next) {
  try {
    const { id } = req.params;
    const parentId = await getParentIdFromUser(req.user.id);

    const { data, error } = await supabase
      .from('babies')
      .delete()
      .eq('id', id)
      .eq('parent_id', parentId)
      .select();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (data.length === 0) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Baby deleted successfully',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllBabies, getBabyById, createBaby, updateBaby, deleteBaby };

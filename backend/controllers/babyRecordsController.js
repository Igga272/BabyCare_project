const supabase = require('../config/supabase');

async function searchBabies(req, res, next) {
  try {
    const { search } = req.query;

    let query = supabase
      .from('babies')
      .select('*, parents(full_name, contact_number)')
      .order('full_name');

    const { data, error } = await query;

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    let results = data;
    if (search) {
      const term = search.toLowerCase();
      results = data.filter((b) =>
        b.full_name.toLowerCase().includes(term) ||
        (b.parents?.full_name || '').toLowerCase().includes(term)
      );
    }

    res.status(200).json({
      success: true,
      message: 'Babies retrieved successfully',
      data: results
    });
  } catch (err) {
    next(err);
  }
}

async function getBabyProfile(req, res, next) {
  try {
    const { babyId } = req.params;

    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('*, parents(full_name, contact_number)')
      .eq('id', babyId)
      .single();

    if (babyError || !baby) {
      const err = new Error('Baby not found');
      err.statusCode = 404;
      return next(err);
    }

    const [vaccinations, checkups, newbornTests, medications, growth] = await Promise.all([
      supabase.from('baby_vaccinations').select('*, vaccines(name, description)').eq('baby_id', babyId).order('scheduled_date'),
      supabase.from('checkup_records').select('*, doctors(full_name)').eq('baby_id', babyId).order('checkup_date', { ascending: false }),
      supabase.from('newborn_tests').select('*').eq('baby_id', babyId).order('created_at', { ascending: false }),
      supabase.from('medications').select('*').eq('baby_id', babyId).order('start_date', { ascending: false }),
      supabase.from('growth_records').select('*').eq('baby_id', babyId).order('record_date')
    ]);

    res.status(200).json({
      success: true,
      message: 'Baby profile retrieved successfully',
      data: {
        baby,
        vaccinations: vaccinations.data || [],
        checkups: checkups.data || [],
        newbornTests: newbornTests.data || [],
        medications: medications.data || [],
        growth: growth.data || []
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchBabies, getBabyProfile };

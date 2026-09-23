const supabase = require('../config/supabase');

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function calculateStatus(scheduledDate) {
  const today = new Date().toISOString().split('T')[0];
  const overdueThreshold = addDays(scheduledDate, 30);

  if (today > overdueThreshold) {
    return 'overdue';
  }
  if (today >= scheduledDate) {
    return 'due';
  }
  return 'upcoming';
}

async function generateVaccineSchedule(babyId, dateOfBirth) {
  const { data: vaccines, error: vaccineError } = await supabase
    .from('vaccines')
    .select('*');

  if (vaccineError) {
    throw new Error(vaccineError.message);
  }

  const scheduleRows = vaccines.map((vaccine) => {
    const scheduledDate = addDays(dateOfBirth, vaccine.recommended_age_days);
    return {
      baby_id: babyId,
      vaccine_id: vaccine.id,
      scheduled_date: scheduledDate,
      status: calculateStatus(scheduledDate)
    };
  });

  const { error: insertError } = await supabase
    .from('baby_vaccinations')
    .insert(scheduleRows);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

module.exports = { generateVaccineSchedule, calculateStatus };

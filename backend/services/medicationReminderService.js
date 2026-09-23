const supabase = require('../config/supabase');

function normalizeTimes(scheduleTimes) {
  if (!scheduleTimes) return [];
  return scheduleTimes.split(',').map((t) => t.trim().slice(0, 5)).filter(Boolean);
}

function getCurrentDateTimeParts() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return { today: `${yyyy}-${mm}-${dd}`, currentTime: `${hh}:${min}` };
}

async function checkAndCreateReminders(babyIds) {
  if (!babyIds || babyIds.length === 0) return;

  const { today, currentTime } = getCurrentDateTimeParts();

  const { data: medications, error } = await supabase
    .from('medications')
    .select('id, baby_id, medicine_name, dosage, schedule_times, start_date, end_date, reminder_on')
    .in('baby_id', babyIds)
    .eq('reminder_on', true)
    .lte('start_date', today);

  if (error) throw new Error(error.message);
  if (!medications || medications.length === 0) return;

  const active = medications.filter((m) => !m.end_date || m.end_date >= today);

  const dueEntries = [];
  active.forEach((m) => {
    const times = normalizeTimes(m.schedule_times);
    if (times.includes(currentTime)) {
      dueEntries.push({
        medication_id: m.id,
        baby_id: m.baby_id,
        scheduled_date: today,
        scheduled_time: currentTime
      });
    }
  });

  if (dueEntries.length === 0) return;

  const { error: insertError } = await supabase
    .from('medication_reminder_logs')
    .upsert(dueEntries, { onConflict: 'medication_id,scheduled_date,scheduled_time', ignoreDuplicates: true });

  if (insertError) throw new Error(insertError.message);
}

module.exports = { checkAndCreateReminders };
const supabase = require('../config/supabase');
const { sendMedicineReminderEmail } = require('./emailService');

const DEFAULT_TIMEZONE = 'Asia/Manila';
const TICK_MS = 60 * 1000;
const MEDICINE_GRACE_MINUTES = 5;

function resolveTimezone() {
  const candidate = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch (err) {
    return DEFAULT_TIMEZONE;
  }
}

const APP_TIMEZONE = resolveTimezone();

function getNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type).value;
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));

  return {
    today: `${get('year')}-${get('month')}-${get('day')}`,
    minutesOfDay: hour * 60 + minute
  };
}

function parseTimeToMinutes(raw) {
  const match = String(raw).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

function toTimeKey(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function parseScheduleTimes(scheduleTimes) {
  if (!scheduleTimes) return [];
  const minutes = String(scheduleTimes)
    .split(',')
    .map((part) => parseTimeToMinutes(part))
    .filter((value) => value !== null);
  return [...new Set(minutes)];
}

async function getBabyContacts(babyIds) {
  const contacts = new Map();
  const uniqueBabyIds = [...new Set(babyIds)];
  if (uniqueBabyIds.length === 0) return contacts;

  const { data: babies, error: babiesError } = await supabase
    .from('babies')
    .select('id, full_name, parent_id')
    .in('id', uniqueBabyIds);
  if (babiesError) throw new Error(babiesError.message);

  const parentIds = [...new Set((babies || []).map((b) => b.parent_id))];
  if (parentIds.length === 0) return contacts;

  const { data: parents, error: parentsError } = await supabase
    .from('parents')
    .select('id, user_id')
    .in('id', parentIds);
  if (parentsError) throw new Error(parentsError.message);

  const userIds = [...new Set((parents || []).map((p) => p.user_id))];
  if (userIds.length === 0) return contacts;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .in('id', userIds);
  if (usersError) throw new Error(usersError.message);

  const userById = new Map((users || []).map((u) => [u.id, u]));
  const parentById = new Map((parents || []).map((p) => [p.id, p]));

  (babies || []).forEach((baby) => {
    const parent = parentById.get(baby.parent_id);
    const user = parent ? userById.get(parent.user_id) : null;
    if (user && user.email && user.email_verified) {
      contacts.set(baby.id, { babyName: baby.full_name, email: user.email });
    }
  });

  return contacts;
}

async function releaseMedicineClaim(entry) {
  const { error } = await supabase
    .from('medication_reminder_logs')
    .delete()
    .eq('medication_id', entry.medication_id)
    .eq('scheduled_date', entry.scheduled_date)
    .eq('scheduled_time', entry.scheduled_time);
  if (error) console.error('Failed to release medicine reminder claim:', error.message);
}

async function processMedicineReminders(now) {
  const { data: medications, error } = await supabase
    .from('medications')
    .select('id, baby_id, medicine_name, dosage, schedule_times, start_date, end_date')
    .eq('reminder_on', true)
    .lte('start_date', now.today);

  if (error) throw new Error(error.message);

  const dueEntries = [];
  (medications || []).forEach((m) => {
    if (m.end_date && m.end_date < now.today) return;

    parseScheduleTimes(m.schedule_times).forEach((minutes) => {
      const elapsed = now.minutesOfDay - minutes;
      if (elapsed >= 0 && elapsed <= MEDICINE_GRACE_MINUTES) {
        dueEntries.push({
          medication_id: m.id,
          baby_id: m.baby_id,
          scheduled_date: now.today,
          scheduled_time: toTimeKey(minutes)
        });
      }
    });
  });

  if (dueEntries.length === 0) return;

  const { data: claimed, error: claimError } = await supabase
    .from('medication_reminder_logs')
    .upsert(dueEntries, { onConflict: 'medication_id,scheduled_date,scheduled_time', ignoreDuplicates: true })
    .select('medication_id, baby_id, scheduled_date, scheduled_time');

  if (claimError) throw new Error(claimError.message);
  if (!claimed || claimed.length === 0) return;

  const contacts = await getBabyContacts(claimed.map((c) => c.baby_id));
  const medicationById = new Map(medications.map((m) => [m.id, m]));

  for (const entry of claimed) {
    const medication = medicationById.get(entry.medication_id);
    const contact = contacts.get(entry.baby_id);
    if (!medication || !contact) continue;

    try {
      await sendMedicineReminderEmail(contact.email, {
        medicineName: medication.medicine_name,
        babyName: contact.babyName,
        dosage: medication.dosage
      });
    } catch (emailErr) {
      console.error('Failed to send medicine reminder email:', emailErr.message);
      await releaseMedicineClaim(entry);
    }
  }
}

async function runReminderCycle(now = getNowParts()) {
  try {
    await processMedicineReminders(now);
  } catch (err) {
    console.error('Medicine reminder check failed:', err.message);
  }
}

function startReminderScheduler() {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runReminderCycle();
    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    } finally {
      running = false;
    }
  };

  tick();
  console.log(`Medicine reminder scheduler started (timezone: ${APP_TIMEZONE})`);
  return setInterval(tick, TICK_MS);
}

module.exports = { startReminderScheduler, runReminderCycle };

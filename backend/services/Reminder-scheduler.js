const supabase = require('../config/supabase');
const { sendMedicineReminderEmail, sendVaccineReminderEmail } = require('./emailService');

const DEFAULT_TIMEZONE = 'Asia/Manila';
const TICK_MS = 60 * 1000;
const MEDICINE_GRACE_MINUTES = 5;
const OVERDUE_AFTER_DAYS = 30;

function resolveTimezone() {
  const candidate = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch (err) {
    return DEFAULT_TIMEZONE;
  }
}

function resolveVaccineHour() {
  const raw = process.env.VACCINE_REMINDER_HOUR;
  const parsed = raw !== undefined && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : 8;
}

const APP_TIMEZONE = resolveTimezone();
const VACCINE_REMINDER_HOUR = resolveVaccineHour();
let lastVaccineRunDate = null;

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
    hour,
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

function daysBetween(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
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

async function processVaccineReminders(now) {
  if (lastVaccineRunDate === now.today) return;
  if (now.hour < VACCINE_REMINDER_HOUR) return;

  const { data: pending, error } = await supabase
    .from('baby_vaccinations')
    .select('id, baby_id, scheduled_date, vaccines(name)')
    .neq('status', 'completed')
    .lte('scheduled_date', now.today);

  if (error) throw new Error(error.message);

  const rows = pending || [];

  if (rows.length > 0) {
    const { data: claimed, error: claimError } = await supabase
      .from('vaccine_reminder_email_log')
      .upsert(
        rows.map((r) => ({ baby_vaccination_id: r.id, sent_date: now.today })),
        { onConflict: 'baby_vaccination_id,sent_date', ignoreDuplicates: true }
      )
      .select('baby_vaccination_id');

    if (claimError) throw new Error(claimError.message);

    const claimedIds = new Set((claimed || []).map((c) => c.baby_vaccination_id));
    const newlyClaimed = rows.filter((r) => claimedIds.has(r.id));

    if (newlyClaimed.length > 0) {
      const contacts = await getBabyContacts(newlyClaimed.map((r) => r.baby_id));
      const vaccinesByBaby = new Map();

      newlyClaimed.forEach((r) => {
        if (!vaccinesByBaby.has(r.baby_id)) vaccinesByBaby.set(r.baby_id, []);
        vaccinesByBaby.get(r.baby_id).push({
          name: r.vaccines?.name || 'Vaccine',
          scheduledDate: r.scheduled_date,
          status: daysBetween(r.scheduled_date, now.today) > OVERDUE_AFTER_DAYS ? 'overdue' : 'due'
        });
      });

      for (const [babyId, vaccines] of vaccinesByBaby) {
        const contact = contacts.get(babyId);
        if (!contact) continue;

        vaccines.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

        try {
          await sendVaccineReminderEmail(contact.email, { babyName: contact.babyName, vaccines });
        } catch (emailErr) {
          console.error('Failed to send vaccine reminder email:', emailErr.message);
        }
      }
    }
  }

  lastVaccineRunDate = now.today;
}

async function runReminderCycle(now = getNowParts()) {
  try {
    await processMedicineReminders(now);
  } catch (err) {
    console.error('Medicine reminder check failed:', err.message);
  }

  try {
    await processVaccineReminders(now);
  } catch (err) {
    console.error('Vaccine reminder check failed:', err.message);
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
  console.log(`Reminder scheduler started (timezone: ${APP_TIMEZONE}, vaccine emails from ${String(VACCINE_REMINDER_HOUR).padStart(2, '0')}:00)`);
  return setInterval(tick, TICK_MS);
}

module.exports = { startReminderScheduler, runReminderCycle };

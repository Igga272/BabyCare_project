const supabase = require('../config/supabase');
const { checkAndCreateReminders } = require('./medicationReminderService');

async function getParentIdFromUser(userId) {
  const { data } = await supabase.from('parents').select('id').eq('user_id', userId).single();
  return data ? data.id : null;
}

async function getNotificationsForUser(userId) {
  const parentId = await getParentIdFromUser(userId);
  if (!parentId) return [];

  const { data: babies, error: babiesError } = await supabase
    .from('babies')
    .select('id, full_name')
    .eq('parent_id', parentId);

  if (babiesError) throw new Error(babiesError.message);
  if (!babies || babies.length === 0) return [];

  const babyIds = babies.map((b) => b.id);
  const babyNameMap = new Map(babies.map((b) => [b.id, b.full_name]));

  await checkAndCreateReminders(babyIds);

  const { data: vaccinations, error: vaccinationsError } = await supabase
    .from('baby_vaccinations')
    .select('id, baby_id, scheduled_date, status, vaccines(name)')
    .in('baby_id', babyIds)
    .in('status', ['due', 'overdue'])
    .order('scheduled_date', { ascending: true });

  if (vaccinationsError) throw new Error(vaccinationsError.message);

  const vaccineList = vaccinations || [];
  let vaccineNotifications = [];

  if (vaccineList.length > 0) {
    const { data: reads, error: readsError } = await supabase
      .from('notification_reads')
      .select('baby_vaccination_id')
      .eq('user_id', userId)
      .in('baby_vaccination_id', vaccineList.map((v) => v.id));

    if (readsError) throw new Error(readsError.message);

    const readIds = new Set((reads || []).map((r) => r.baby_vaccination_id));

    vaccineNotifications = vaccineList.map((v) => ({
      id: `vaccine-${v.id}`,
      type: 'vaccine',
      baby_id: v.baby_id,
      baby_name: babyNameMap.get(v.baby_id),
      vaccine_name: v.vaccines?.name,
      scheduled_date: v.scheduled_date,
      status: v.status,
      is_read: readIds.has(v.id)
    }));
  }

  const { data: reminderLogs, error: reminderError } = await supabase
    .from('medication_reminder_logs')
    .select('id, medication_id, baby_id, scheduled_date, scheduled_time, is_read, medications(medicine_name, dosage)')
    .in('baby_id', babyIds)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false });

  if (reminderError) throw new Error(reminderError.message);

  const medicineNotifications = (reminderLogs || []).map((r) => ({
    id: `medicine-${r.id}`,
    type: 'medicine',
    baby_id: r.baby_id,
    baby_name: babyNameMap.get(r.baby_id),
    medicine_name: r.medications?.medicine_name,
    dosage: r.medications?.dosage,
    scheduled_date: r.scheduled_date,
    scheduled_time: r.scheduled_time,
    is_read: r.is_read
  }));

  return [...vaccineNotifications, ...medicineNotifications];
}

async function markNotificationRead(userId, id) {
  if (String(id).startsWith('medicine-')) {
    const logId = String(id).replace('medicine-', '');
    const parentId = await getParentIdFromUser(userId);

    const { data: log } = await supabase
      .from('medication_reminder_logs')
      .select('id, babies(parent_id)')
      .eq('id', logId)
      .single();

    if (!log || log.babies.parent_id !== parentId) {
      const err = new Error('Notification not found');
      err.statusCode = 404;
      throw err;
    }

    const { error } = await supabase
      .from('medication_reminder_logs')
      .update({ is_read: true })
      .eq('id', logId);

    if (error) throw new Error(error.message);
    return;
  }

  const vaccinationId = String(id).replace('vaccine-', '');
  const { error } = await supabase
    .from('notification_reads')
    .upsert({ user_id: userId, baby_vaccination_id: vaccinationId }, { onConflict: 'user_id,baby_vaccination_id' });

  if (error) throw new Error(error.message);
}

async function markAllNotificationsRead(userId) {
  const notifications = await getNotificationsForUser(userId);
  const unread = notifications.filter((n) => !n.is_read);
  if (unread.length === 0) return;

  for (const n of unread) {
    await markNotificationRead(userId, n.id);
  }
}

module.exports = { getNotificationsForUser, markNotificationRead, markAllNotificationsRead };
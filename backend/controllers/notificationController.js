const { getNotificationsForUser, markNotificationRead, markAllNotificationsRead } = require('../services/notificationService');

async function getNotifications(req, res, next) {
  try {
    const notifications = await getNotificationsForUser(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: notifications
    });
  } catch (err) {
    next(err);
  }
}

async function readNotification(req, res, next) {
  try {
    const { id } = req.params;
    await markNotificationRead(req.user.id, id);
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    next(err);
  }
}

async function readAllNotifications(req, res, next) {
  try {
    await markAllNotificationsRead(req.user.id);
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, readNotification, readAllNotifications };
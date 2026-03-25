const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification to a single Expo push token.
 * Silently no-ops if the token is missing or invalid.
 *
 * @param {string|null} pushToken - Expo push token
 * @param {string} title
 * @param {string} body
 */
async function sendPushNotification(pushToken, title, body) {
  if (!pushToken) return;
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
  };

  try {
    const receipts = await expo.sendPushNotificationsAsync([message]);
    receipts.forEach((receipt) => {
      if (receipt.status === 'error') {
        console.error('Push notification error:', receipt.message, receipt.details);
      }
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

/**
 * Notify all users in splitWith that an expense was added.
 *
 * @param {object[]} splitWithUsers - Array of { user: { pushToken, name }, amount }
 * @param {string} paidByName - Name of the user who paid
 * @param {string} description - Expense description
 */
async function notifyExpenseCreated(splitWithUsers, paidByName, description) {
  const promises = splitWithUsers.map(({ user, amount }) => {
    if (!user || !user.pushToken) return Promise.resolve();
    const title = 'New Expense Added';
    const body = `${paidByName} added "${description}" — you owe $${amount.toFixed(2)}`;
    return sendPushNotification(user.pushToken, title, body);
  });
  await Promise.all(promises);
}

/**
 * Notify a user that a friend settled up with them.
 *
 * @param {string|null} recipientPushToken
 * @param {string} fromName - Name of the user who paid
 * @param {number} amount
 */
async function notifySettlementCreated(recipientPushToken, fromName, amount) {
  const title = 'Payment Received';
  const body = `${fromName} paid you $${Number(amount).toFixed(2)}`;
  await sendPushNotification(recipientPushToken, title, body);
}

module.exports = { sendPushNotification, notifyExpenseCreated, notifySettlementCreated };

const axios = require('axios');

async function sendViberReply(user, to, text) {
  const token = user.viberToken;
  if (!token) throw new Error('Viber nije podešen');
  await axios.post('https://chatapi.viber.com/pa/send_message', {
    receiver: to,
    type: 'text',
    text,
    auth_token: token
  }, { headers: { 'X-Viber-Auth-Token': token } });
}

module.exports = { sendViberReply };

'use strict';

const { card, COLORS } = require('../../utils/components');

const category   = 'misc';
const prefixName = 'ping';
const aliases    = ['p', 'latency'];

async function prefixExecute(message) {
  const sent  = await message.reply(card({ title: 'Pinging…', color: COLORS.gray }));
  const latency = sent.createdTimestamp - message.createdTimestamp;
  const ws      = message.client.ws.ping;

  await sent.edit(card({
    title: '🏓 Pong!',
    desc:  `**Message latency** ${latency}ms\n**WebSocket heartbeat** ${ws}ms`,
    color: latency < 150 ? COLORS.green : latency < 400 ? COLORS.yellow : COLORS.red,
  }));
}

module.exports = { prefixName, aliases, category, prefixExecute };

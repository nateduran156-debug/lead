const { ButtonStyle } = require('discord.js');

const CV2_FLAG = 1 << 15;

const COLORS = {
  success: 0x57F287,
  error:   0xED4245,
  warning: 0xFEE75C,
  info:    0x5865F2,
  default: 0x2B2D31,
  white:   0xFFFFFF,
  black:   0x000000,
  blurple: 0x5865F2,
  red:     0xED4245,
  green:   0x57F287,
  yellow:  0xFEE75C,
  grey:    0x4F545C,
};

function container(components, accentColor = null) {
  const c = { type: 17, components };
  if (accentColor !== null) c.accent_color = accentColor;
  return c;
}

function textDisplay(content) {
  return { type: 10, content };
}

function separator(divider = true, spacing = 1) {
  return { type: 14, divider, spacing };
}

function section(textComponents, accessory = null) {
  const s = { type: 9, components: textComponents };
  if (accessory) s.accessory = accessory;
  return s;
}

function thumbnail(url) {
  return { type: 11, media: { url } };
}

function actionRow(components) {
  return { type: 1, components };
}

function button(label, customId, style = ButtonStyle.Secondary, disabled = false) {
  return { type: 2, label, custom_id: customId, style, disabled };
}

function linkButton(label, url) {
  return { type: 2, label, url, style: ButtonStyle.Link };
}

function primaryButton(label, customId, disabled = false) {
  return button(label, customId, ButtonStyle.Primary, disabled);
}

function dangerButton(label, customId, disabled = false) {
  return button(label, customId, ButtonStyle.Danger, disabled);
}

function successButton(label, customId, disabled = false) {
  return button(label, customId, ButtonStyle.Success, disabled);
}

function selectMenu(customId, placeholder, options, minValues = 1, maxValues = 1) {
  return {
    type: 3,
    custom_id: customId,
    placeholder,
    min_values: minValues,
    max_values: maxValues,
    options,
  };
}

function selectOption(label, value, description = null) {
  const opt = { label, value };
  if (description) opt.description = description;
  return opt;
}

function cv2Reply(components, ephemeral = false) {
  const payload = { flags: CV2_FLAG, components };
  if (ephemeral) payload.flags |= 1 << 6;
  return payload;
}

function cv2Update(components) {
  return { flags: CV2_FLAG, components };
}

function card(components, accentColor = null) {
  return container(components, accentColor);
}

function ok(text, ephemeral = false) {
  return cv2Reply([container([textDisplay(text)], COLORS.success)], ephemeral);
}

function err(text, ephemeral = true) {
  return cv2Reply([container([textDisplay(text)], COLORS.error)], ephemeral);
}

function warn(text, ephemeral = false) {
  return cv2Reply([container([textDisplay(text)], COLORS.warning)], ephemeral);
}

async function prefixSend(message, components) {
  return message.reply({ flags: CV2_FLAG, components });
}

async function prefixOk(message, text) {
  return prefixSend(message, [container([textDisplay(text)], COLORS.success)]);
}

async function prefixErr(message, text) {
  return prefixSend(message, [container([textDisplay(text)], COLORS.error)]);
}

module.exports = {
  CV2_FLAG,
  COLORS,
  container,
  card,
  ok,
  err,
  warn,
  prefixOk,
  prefixErr,
  textDisplay,
  separator,
  section,
  thumbnail,
  actionRow,
  button,
  linkButton,
  primaryButton,
  dangerButton,
  successButton,
  selectMenu,
  selectOption,
  cv2Reply,
  cv2Update,
  prefixSend,
};

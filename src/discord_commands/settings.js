const reload = require('require-reload')(require);

const Hook = reload('./../discord_message_processors/user_and_channel_hook.js');
const state = require('./../unreloadable_data.js');

// CONFIG START

const EMBED_COLOR = 2522111;
const ALIASES = ['settings', 'setting'];
const HELP_SHORT_DESCRIPTION = 'Configure my settings.';
const HELP_LONG_DESCRIPTION = 'Configure my settings. Server admins can configure my default settings on their server. Users can configure user settings.';

// CONFIG END

if (!state.settingsCommand) {
  state.settingsCommand = {
    msgSentForKey: {},
    itemIdSentForKey: {},
  };
}

const Location = {
  ME: 'me',
  THIS_SERVER: 'this server',
  THIS_CHANNEL: 'this channel',
};

const { msgSentForKey, itemIdSentForKey } = state.settingsCommand;

const CATEGORY_DESCRIPTION = 'The following subcategories and settings are available. Type the number of the one you want to see/change.';
const HOOK_EXPIRATION_MS = 180000;
const CANCEL = 'cancel';
const BACK = 'back';

function createKeyForMsg(msg) {
  return msg.channel.id + msg.author.id;
}

function tryUnregisterHook(hook) {
  if (hook) {
    return hook.unregister();
  }

  return undefined;
}

function clearStateForMsg(msg) {
  const key = createKeyForMsg(msg);
  delete state.settingsCommand.msgSentForKey[key];
  delete state.settingsCommand.itemIdSentForKey[key];
}

async function sendMessageUnique(responseToMsg, content, itemId) {
  const key = createKeyForMsg(responseToMsg);

  // Don't delete and send the same message.
  if (itemIdSentForKey[key] === itemId) {
    return undefined;
  }
  if (msgSentForKey[key]) {
    try {
      await msgSentForKey[key].delete();
    } catch (err) {
      // Swallow
    }
  }

  const sendMessagePromise = responseToMsg.channel.createMessage(content, null, responseToMsg);
  const sentMessage = await sendMessagePromise;
  msgSentForKey[key] = sentMessage;
  itemIdSentForKey[key] = itemId;

  return sendMessagePromise;
}

function isCategory(settingsTreeNode) {
  return !!settingsTreeNode.children;
}

function createFieldsForChildren(children) {
  const categories = [];
  const settings = [];

  children.forEach((child) => {
    if (isCategory(child)) {
      categories.push(child);
    } else {
      settings.push(child);
    }
  });

  let optionNumber = 0;

  const settingsString = settings.map((setting) => {
    optionNumber += 1;
    const adminOnlyString = !setting.userSetting ? ' (*server admin only*)' : '';
    return `${optionNumber}. ${setting.userFacingName}${adminOnlyString}`;
  }).join('\n');

  const categoriesString = categories.map((category) => {
    optionNumber += 1;
    return `${optionNumber}. ${category.userFacingName}`;
  }).join('\n');

  const fields = [];

  if (settingsString) {
    fields.push({ name: 'Settings', value: settingsString });
  }
  if (categoriesString) {
    fields.push({ name: 'Subcategories', value: categoriesString });
  }

  return fields;
}

function createContentForRoot(children, iconUri) {
  return {
    embed: {
      title: 'Settings',
      description: CATEGORY_DESCRIPTION,
      fields: createFieldsForChildren(children),
      color: EMBED_COLOR,
      footer: {
        icon_url: iconUri,
        text: 'Say \'cancel\' to cancel.',
      },
    },
  };
}

function createContentForCategory(category, iconUri) {
  return {
    embed: {
      title: `Settings (${category.userFacingName})`,
      description: CATEGORY_DESCRIPTION,
      fields: createFieldsForChildren(category.children),
      color: EMBED_COLOR,
      footer: {
        icon_url: iconUri,
        text: 'You can also say \'back\' or \'cancel\'.',
      },
    },
  };
}

async function createContentForSetting(msg, settings, setting, iconUri) {
  return {
    embed: {
      title: `Settings (${setting.userFacingName})`,
      description: setting.description,
      color: EMBED_COLOR,
      fields: [
        {
          name: 'Allowed values',
          value: setting.allowedValuesDescription,
        },
        {
          name: 'Can be changed by',
          value: setting.userSetting ? 'Anyone' : 'Server admin',
        },
        {
          name: 'Current value',
          value: await settings.getUserFacingSettingValue(
            setting.uniqueId,
            msg.channel.guild ? msg.channel.guild.id : msg.channel.id,
            msg.channel.id,
            msg.author.id,
          ),
        },
      ],
      footer: {
        icon_url: iconUri,
        text: 'To change the value, type in the new value. Or say \'back\' or \'cancel\'.',
      },
    },
  };
}

function messageToIndex(msg) {
  const msgAsInt = parseInt(msg.content, 10);
  return msgAsInt - 1;
}

function handleExpiration(msg) {
  return msg.channel.createMessage('The settings menu has closed due to inactivity.', null, msg);
}

function findParent(children, targetNode, previous) {
  if (!children) {
    return undefined;
  }

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child === targetNode) {
      return previous;
    }
    const childResult = findParent(child.children, targetNode, child);
    if (childResult) {
      return childResult;
    }
  }

  return undefined;
}

function tryGoBack(hook, msg, monochrome, settingsNode) {
  const root = monochrome.getSettings().getRawSettingsTree();
  if (msg.content.toLowerCase() === 'back') {
    const parent = findParent(monochrome.getSettings().getRawSettingsTree(), settingsNode, root);
    if (parent) {
      tryUnregisterHook(hook);

      // These functions are circularly dependent.
      // eslint-disable-next-line no-use-before-define
      return showNode(monochrome, msg, parent);
    }
  }

  return false;
}

function tryCancel(hook, msg) {
  if (msg.content.toLowerCase() === 'cancel') {
    tryUnregisterHook(hook);
    return msg.channel.createMessage('The settings menu has been closed.', null, msg);
  }

  return false;
}

function handleRootViewMsg(hook, monochrome, msg) {
  const index = messageToIndex(msg);
  const settingsNodes = monochrome.getSettings().getRawSettingsTree();
  if (index >= 0 && index < settingsNodes.length) {
    const nextNode = settingsNodes[index];
    tryUnregisterHook(hook);
    // These functions are circularly dependent.
    // eslint-disable-next-line no-use-before-define
    return showNode(monochrome, msg, nextNode);
  }

  return tryCancel(hook, msg);
}

// If there's an invalid channel string, returns that string.
// Otherwise returns an array of channel ids.
function getChannelIds(locationString, msg) {
  const channelStrings = locationString.split(/ +/);
  const channelIds = [];

  for (let i = 0; i < channelStrings.length; i += 1) {
    const channelString = channelStrings[i];
    const regexResult = /<#(.*?)>/.exec(channelString);
    const { channels } = msg.channel.guild;
    if (!regexResult || !channels.find(channel => channel.id === regexResult[1])) {
      return channelString;
    }
    channelIds.push(regexResult[1]);
  }

  return channelIds;
}

function createLocationPromptString(settingNode, isDm) {
  if (isDm) {
    if (settingNode.userSetting && (settingNode.serverSetting || settingNode.channelSetting)) {
      return `Where should the new setting be applied? You can say **${Location.ME}** or **${Location.THIS_SERVER}**. You can also say **${CANCEL}** or **${BACK}**.`;
    }
    throw new Error('If we\'re in a DM and the setting isn\'t a userSetting and either a server or channel setting, we shouldn\'t prompt for location.');
  }
  if (settingNode.serverSetting && settingNode.userSetting && settingNode.channelSetting) {
    return `Where should the new setting be applied? You can say **${Location.ME}**, **${Location.THIS_SERVER}**, **${Location.THIS_CHANNEL}**, or list channels, for example: **#general #bot #quiz**. You can also say **${CANCEL}** or **${BACK}**.`;
  }
  if (settingNode.serverSetting && settingNode.channelSetting) {
    return `Where should the new setting be applied? You can say **${Location.THIS_SERVER}**, **${Location.THIS_CHANNEL}**, or list channels, for example: **#general #bot #quiz**. You can also say **${CANCEL}** or **${BACK}**.`;
  }
  if (settingNode.serverSetting && settingNode.userSetting) {
    return `Where should the new setting be applied? You can say **${Location.ME}** or **${Location.THIS_SERVER}**. You can also say **${CANCEL}** or **${BACK}**.`;
  }
  if (settingNode.userSetting && settingNode.channelSetting) {
    return `Where should the new setting be applied? You can say **${Location.ME}**, **${Location.THIS_CHANNEL}**, or list channels, for example: **#general #bot #quiz**. You can also say **${CANCEL}** or **${BACK}**.`;
  }
  if (settingNode.userSetting) {
    throw new Error('If the setting is only a user setting, we shouldn\'t be prompting for location.');
  }
  if (settingNode.serverSetting) {
    throw new Error('If the setting is only a server setting, we shouldn\'t be prompting for location.');
  }
  if (settingNode.channelSetting) {
    return `Where should the new setting be applied? You can say **${Location.THIS_CHANNEL}**, or list channels, for example: **#general #bot #quiz**. You can also say **${CANCEL}** or **${BACK}**.`;
  }
  throw new Error('Unexpected fallthrough');
}

function tryCreateLocationErrorString(locationString, msg, setting) {
  const locationStringLowerCase = locationString.toLowerCase();
  if (locationStringLowerCase === Location.ME) {
    if (!setting.userSetting) {
      if (setting.serverSetting && setting.channelSetting) {
        return `That setting cannot be set as a user setting. You can say **${Location.THIS_SERVER}**, **${Location.THIS_CHANNEL}**, **${CANCEL}**, **${BACK}**, or provide a list of channels separated by spaces, for example: **#general #bot**`;
      }
      if (setting.serverSetting) {
        throw new Error('If the setting is only a server setting, we shouldn\'t be prompting for location.');
      }
      if (setting.channelSetting) {
        return `That setting cannot be set as a user setting, it can only be set per channel. You can say **${Location.THIS_CHANNEL}**, **${CANCEL}**, **${BACK}**, or provide a list of channels separated by spaces, for example: **#general #bot**`;
      }
      throw new Error('Unexpected fallthrough');
    }

    return undefined;
  }
  if (locationStringLowerCase === Location.THIS_SERVER) {
    if (!setting.serverSetting) {
      if (setting.userSetting && setting.channelSetting) {
        return `That setting cannot be set as a server setting. You can say **${Location.ME}**, **${Location.THIS_CHANNEL}**, **${CANCEL}**, **${BACK}**, or provide a list of channels separated by spaces, for example: **#general #bot**`;
      }
      if (setting.userSetting) {
        throw new Error('If the setting is only a user setting, we shouldn\'t be prompting for location.');
      }
      if (setting.channelSetting) {
        return `That setting cannot be set as a server setting, it can only be set per channel. You can say **${Location.THIS_CHANNEL}**, **${CANCEL}**, **${BACK}**, or provide a list of channels separated by spaces, for example: **#general #bot**`;
      }
      throw new Error('Unexpected fallthrough');
    }

    return undefined;
  }
  if (locationStringLowerCase === Location.THIS_CHANNEL) {
    if (!setting.channelSetting) {
      if (setting.userSetting && setting.serverSetting) {
        return `That setting cannot be set as a channel setting. You can say **${Location.ME}**, **${Location.THIS_SERVER}**, **${CANCEL}**, or **${BACK}**.`;
      }
      if (setting.userSetting) {
        throw new Error('If the setting is only a user setting, we shouldn\'t be prompting for location.');
      }
      if (setting.serverSetting) {
        throw new Error('If the setting is only a server setting, we shouldn\'t be prompting for location.');
      }
      throw new Error('Unexpected fallthrough');
    }

    return undefined;
  }

  // If we're here, then we are treating the location string as a list of channels.
  const channelIds = getChannelIds(locationStringLowerCase, msg);
  if (typeof channelIds === typeof '') {
    return `I didn't find a channel in this server called **${channelIds}**. Please check that the channel exists and try again.`;
  }

  // No error
  return undefined;
}

function tryHandleCancelBack(hook, monochrome, msg, node) {
  const cancelResult = tryCancel(hook, msg);
  if (cancelResult) {
    return cancelResult;
  }

  return tryGoBack(
    hook,
    msg,
    monochrome,
    node,
  );
}

async function tryApplyNewSetting(
  hook,
  monochrome,
  msg,
  setting,
  newUserFacingValue,
  locationString,
  confirmationSupplied,
) {
  const settings = monochrome.getSettings();
  const userIsServerAdmin = monochrome.userIsServerAdmin(msg);

  const cancelBackResult = tryHandleCancelBack(hook, monochrome, msg, setting);
  if (cancelBackResult) {
    return cancelBackResult;
  }

  const locationErrorString = tryCreateLocationErrorString(locationString, msg, setting);
  if (locationErrorString) {
    return msg.channel.createMessage(locationErrorString, null, msg);
  }

  if (setting.requireConfirmation && !confirmationSupplied) {
    // These functions are circularly dependent.
    // eslint-disable-next-line no-use-before-define
    return requestConfirmation(
      hook,
      monochrome,
      msg,
      setting,
      newUserFacingValue,
      locationString,
    );
  }

  const serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
  const locationStringLowerCase = locationString.toLowerCase();
  let setResults;
  let resultString;

  if (locationStringLowerCase === Location.ME) {
    resultString = 'The new setting has been applied as a user setting. It will take effect whenever you use the command. It will override server and channel settings. The settings menu is now closed.';
    setResults = [
      await settings.setUserSettingValue(
        setting.uniqueId,
        msg.author.id,
        newUserFacingValue,
      ),
    ];
  } else if (locationStringLowerCase === Location.THIS_CHANNEL) {
    resultString = 'The new setting has been applied to this channel. It will override the server-wide setting in this channel, but will be overriden by user settings. The settings menu is now closed.';
    setResults = [
      await settings.setChannelSettingValue(
        setting.uniqueId,
        serverId,
        msg.channel.id,
        newUserFacingValue,
        userIsServerAdmin,
      ),
    ];
  } else if (locationStringLowerCase === Location.THIS_SERVER) {
    resultString = 'The new setting has been applied to all channels in this server. You can set this setting as a channel setting in specific channels where you want to override the server setting. The settings menu is now closed.';
    setResults = [
      await settings.setServerWideSettingValue(
        setting.uniqueId,
        serverId,
        newUserFacingValue,
        userIsServerAdmin,
      ),
    ];
  } else {
    resultString = `The new setting has been applied to the channels: ${locationString}. It will override the server-wide setting in those channels, but will be overriden by user settings. The settings menu is now closed.`;
    const channelIds = getChannelIds(locationString, msg);

    const promises = channelIds.map(channelId => settings.setChannelSettingValue(
      setting.uniqueId,
      serverId,
      channelId,
      newUserFacingValue,
      userIsServerAdmin,
    ));

    setResults = await Promise.all(promises);
  }

  tryUnregisterHook(hook);

  for (let i = 0; i < setResults.length; i += 1) {
    const result = setResults[i];
    if (!result.accepted) {
      monochrome.getLogger().logFailure('SETTINGS', `Unexpected setting update rejection. Reason: ${result.reason}`);
      return msg.channel.createMessage('There was an error updating that setting. Sorry. I\'ll look into it!', null, msg);
    }
  }

  return msg.channel.createMessage(resultString, null, msg);
}

async function requestConfirmation(
  hook,
  monochrome,
  msg,
  setting,
  newUserFacingValue,
  locationString,
) {
  tryUnregisterHook(hook);

  const newHook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg) => {
      const cancelBackResult = tryHandleCancelBack(cbHook, monochrome, cbMsg, setting);
      if (cancelBackResult) {
        return cancelBackResult;
      }

      const contentLowerCase = cbMsg.content.toLowerCase();
      if (contentLowerCase === 'confirm') {
        return tryApplyNewSetting(
          cbHook,
          monochrome,
          cbMsg,
          setting,
          newUserFacingValue,
          locationString,
          true,
        );
      }
      return msg.channel.createMessage('I don\'t understand that response. You can say **confirm** to confirm, or **cancel** to cancel.', null, msg);
    },
    monochrome.getLogger(),
  );

  newHook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));

  return msg.channel.createMessage(`You are changing the value of **${setting.userFacingName}** to **${newUserFacingValue}**. Is this correct? Say **confirm** to confirm, or **cancel** to cancel.`, null, msg);
}

async function tryPromptForSettingLocation(hook, msg, monochrome, settingNode, newUserFacingValue) {
  const userIsServerAdmin = monochrome.userIsServerAdmin(msg);
  const settings = monochrome.getSettings();
  const isDm = !msg.channel.guild;

  if (!userIsServerAdmin && !settingNode.userSetting) {
    return msg.channel.createMessage('Only a server admin can set that setting. You can say **back** or **cancel**.', null, msg);
  }

  const isValid = await settings.userFacingValueIsValidForSetting(settingNode, newUserFacingValue);
  if (!isValid) {
    await msg.channel.createMessage('That isn\'t a valid value for that setting. Please check the **Allowed values** and try again. You can also say **back** or **cancel**.', null, msg);

    // These functions are circularly dependent.
    // eslint-disable-next-line no-use-before-define
    return showSetting(monochrome, msg, settingNode);
  }

  // If the user is not a server admin, we can shortcut to applying the setting to ME.
  if (!userIsServerAdmin && settingNode.userSetting) {
    return tryApplyNewSetting(hook, monochrome, msg, settingNode, newUserFacingValue, Location.ME);
  }

  // If the message is a DM and the setting is not a user setting
  // but is either a server or channel setting,
  // we can shortcut to setting on this server.
  const isServerOrChannelSetting = settingNode.serverSetting || settingNode.channelSetting;
  if (isDm && (isServerOrChannelSetting) && !settingNode.userSetting) {
    return tryApplyNewSetting(
      hook,
      monochrome,
      msg,
      settingNode,
      newUserFacingValue,
      Location.THIS_SERVER,
    );
  }

  // If the message is only a user setting, we can shortcut.
  if (settingNode.userSetting && !settingNode.serverSetting && !settingNode.channelSetting) {
    return tryApplyNewSetting(hook, monochrome, msg, settingNode, newUserFacingValue, Location.ME);
  }

  // If the message is only a server setting, we can shortcut.
  if (settingNode.serverSetting && !settingNode.userSetting && !settingNode.channelSetting) {
    return tryApplyNewSetting(
      hook,
      monochrome,
      msg,
      settingNode,
      newUserFacingValue,
      Location.THIS_SERVER,
    );
  }

  // If we're here, we couldn't shortcut. Prompt for location.

  if (hook) {
    tryUnregisterHook(hook);
  }

  const newHook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg) => tryApplyNewSetting(
      cbHook,
      monochrome,
      cbMsg,
      settingNode,
      newUserFacingValue,
      cbMsg.content,
    ),
    monochrome.getLogger(),
  );

  newHook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));

  return msg.channel.createMessage(createLocationPromptString(settingNode, isDm), null, msg);
}

async function handleSettingViewMsg(hook, monochrome, msg, setting) {
  const cancelBackResult = tryHandleCancelBack(hook, monochrome, msg, setting);
  if (cancelBackResult) {
    return cancelBackResult;
  }

  const newUserFacingValue = msg.content;
  return tryPromptForSettingLocation(hook, msg, monochrome, setting, newUserFacingValue);
}

function handleCategoryViewMsg(hook, monochrome, msg, category) {
  const index = messageToIndex(msg);
  const childNodes = category.children;
  if (index >= 0 && index < childNodes.length) {
    const nextNode = childNodes[index];
    tryUnregisterHook(hook);

    // These functions are circularly dependent.
    // eslint-disable-next-line no-use-before-define
    return showNode(monochrome, msg, nextNode);
  }

  return tryHandleCancelBack(hook, monochrome, msg, category);
}

function showRoot(monochrome, msg) {
  const settingsTree = monochrome.getSettings().getRawSettingsTree();
  const iconUri = monochrome.getSettingsIconUri();
  const rootContent = createContentForRoot(settingsTree, iconUri);
  const hook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg) => handleRootViewMsg(
      cbHook,
      monochrome,
      cbMsg,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return sendMessageUnique(msg, rootContent, 'root');
}

function showCategory(monochrome, msg, category) {
  const iconUri = monochrome.getSettingsIconUri();
  const categoryContent = createContentForCategory(category, iconUri);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg) => handleCategoryViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      category,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return sendMessageUnique(msg, categoryContent, `category:${category.userFacingName}`);
}

async function showSetting(monochrome, msg, setting) {
  const iconUri = monochrome.getSettingsIconUri();
  const settings = monochrome.getSettings();
  const settingContent = await createContentForSetting(msg, settings, setting, iconUri);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg) => handleSettingViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      setting,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return sendMessageUnique(msg, settingContent, setting.uniqueId);
}

function showNode(monochrome, msg, node) {
  if (Array.isArray(node)) {
    return showRoot(monochrome, msg);
  } else if (node.children) {
    return showCategory(monochrome, msg, node);
  }
  return showSetting(monochrome, msg, node);
}

function shortcut(monochrome, msg, suffix) {
  const settings = monochrome.getSettings();
  const [uniqueId] = suffix.split(' ');
  const value = suffix.split(' ').slice(1).join(' ');
  const setting = settings.getTreeNodeForUniqueId(uniqueId);

  if (!setting) {
    return msg.channel.createMessage(`I didn't find a setting with ID: **${uniqueId}**`, null, msg);
  }
  if (!value) {
    return showNode(monochrome, msg, setting);
  }

  return tryPromptForSettingLocation(undefined, msg, monochrome, setting, value);
}

module.exports = {
  commandAliases: ALIASES,
  uniqueId: 'settings',
  canBeChannelRestricted: false,
  shortDescription: HELP_SHORT_DESCRIPTION,
  longDescription: HELP_LONG_DESCRIPTION,
  action(bot, msg, suffix, monochrome) {
    clearStateForMsg(msg);
    if (suffix) {
      return shortcut(monochrome, msg, suffix);
    }
    return showNode(monochrome, msg, monochrome.getSettings().getRawSettingsTree());
  },
};

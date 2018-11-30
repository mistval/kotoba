const { PublicError } = require('monochrome-bot');
const embedColor = require('./../common/constants.js').EMBED_NEUTRAL_COLOR;

// Configuration start

const EMBED_COLOR = embedColor;
const ALIASES = ['help', 'h'];
const WEB_COMMANDS_URI = 'http://kotobaweb.com/bot'; // If you have commands documentation on the web

const COMMANDS_TO_GENERATE_HELP_FOR = [
  'jisho',
  'jn',
  'kanji',
  'strokeorder',
  'quiz',
  'examples',
  'thesaurus',
  'furigana',
  'pronounce',
  'random',
  'shiritori',
  'shiritoriforever',
  'translate',
  'weblio',
  'jukebox',
  'invite',
  'about',
  'settings',
];

// Configuration end

const PREFIX_REPLACE_REGEX = /<prefix>/g;

function validateCommand(command) {
  const commandName = command.aliases[0];
  if (command.shortDescription && typeof command.shortDescription !== typeof '') {
    throw new Error(`The shortDescription must be a string. It is not for ${commandName}`);
  } else if (command.usageExample && typeof command.usageExample !== typeof '') {
    throw new Error(`The usageExample must be a string. It is not for ${commandName}`);
  } else if (command.longDescription && typeof command.longDescription !== typeof '') {
    throw new Error(`The longDescription must be a string. It is not for ${commandName}`);
  } else if (
    command.aliasesForHelp &&
    (!Array.isArray(command.aliasesForHelp) || command.aliasesForHelp.length < 1)
  ) {
    throw new Error(`The aliasesForHelp must be an array. It is not for ${commandName}`);
  }
}

function prefixAliases(aliases, prefix) {
  return aliases.map(alias => `${prefix}${alias}`);
}

function createTopLevelHelpTextForCommand(command, prefix) {
  validateCommand(command);
  const aliases = command.aliasesForHelp || command.aliases;
  const prefixedAliases = prefixAliases(aliases, prefix);
  const firstPrefixedAlias = prefixedAliases[0];
  const otherPrefixedAliases = prefixedAliases.slice(1);
  let helpText = firstPrefixedAlias;
  if (otherPrefixedAliases.length > 0) {
    helpText += ` (aliases: ${otherPrefixedAliases.join(', ')})`;
  }
  if (command.shortDescription || command.usageExample) {
    helpText += '\n    # ';
  }
  if (command.shortDescription) {
    helpText += `${command.shortDescription.replace(PREFIX_REPLACE_REGEX, prefix)} `;
  }
  if (command.usageExample) {
    helpText += `Example: ${command.usageExample.replace(PREFIX_REPLACE_REGEX, prefix)}`;
  }

  return helpText;
}

function createTopLevelHelpTextForCommands(commands, helpCommandAlias, prefix) {
  if (commands.length === 0) {
    return undefined;
  }

  let helpText = '';

  if (WEB_COMMANDS_URI) {
    helpText = `View commands online at ${WEB_COMMANDS_URI}\n`;
  }

  helpText += '```glsl\n';
  helpText += commands.map(command => createTopLevelHelpTextForCommand(command, prefix)).join('\n');
  helpText += `\n\nSay ${prefix}${helpCommandAlias} [command name] to see more help for a command. Example: ${prefix}${helpCommandAlias} ${commands[0].aliases[0]}\n\`\`\``;

  return helpText;
}

function indexOfAliasInList(command, list) {
  return list.findIndex(alias => command.aliases.indexOf(alias) !== -1);
}

function compareCommandOrder(commandA, commandB, orderList) {
  return indexOfAliasInList(commandA, orderList) - indexOfAliasInList(commandB, orderList);
}

function getCommandsForTopLevelHelpInOrder(nonHiddenCommands, generationOrder) {
  return nonHiddenCommands
    .filter(command => indexOfAliasInList(command, generationOrder) !== -1)
    .sort((a, b) => compareCommandOrder(a, b, generationOrder));
}

async function showGeneralHelp(msg, helpCommandHelper, prefix) {
  const enabledNonHiddenCommands = await helpCommandHelper.getEnabledNonHiddenCommands(msg);
  const commandsToDisplayHelpFor = getCommandsForTopLevelHelpInOrder(
    enabledNonHiddenCommands,
    COMMANDS_TO_GENERATE_HELP_FOR,
  );

  const helpText = createTopLevelHelpTextForCommands(commandsToDisplayHelpFor, ALIASES[0], prefix);
  if (helpText) {
    return msg.channel.createMessage(helpText, null, msg);
  }
  throw PublicError.createWithCustomPublicMessage('There are no commands to show help for. Perhaps the server admins disabled all my commands in this channel.', false, 'No commands to display');
}

function showAdvancedHelp(msg, targetAlias, helpCommandHelper, prefix) {
  const command = helpCommandHelper.findCommand(
    targetAlias,
    msg.channel.guild ? msg.channel.guild.id : msg.channel.id,
  );

  if (!command) {
    return showGeneralHelp(msg, helpCommandHelper, prefix);
  }

  const unprefixedDescription = command.longDescription || command.shortDescription;
  if (!unprefixedDescription) {
    return showGeneralHelp(msg, helpCommandHelper, prefix);
  }

  const fields = [];
  if (command.getCooldown() !== undefined) {
    fields.push({ name: 'Cooldown', value: `${command.getCooldown().toString()} seconds`, inline: true });
  }
  let permissionsString = '';

  if (command.getIsForBotAdminOnly()) {
    permissionsString += 'Bot admin\n';
  }
  if (!permissionsString) {
    permissionsString += 'None';
  }
  fields.push({ name: 'Required permissions', value: permissionsString, inline: true });
  if (command.usageExample) {
    fields.push({ name: 'Usage example', value: command.usageExample.replace(PREFIX_REPLACE_REGEX, prefix) });
  }

  const prefixedDescription = unprefixedDescription.replace(PREFIX_REPLACE_REGEX, prefix);

  const botContent = {
    embed: {
      title: `${prefix}${command.aliases[0]}`,
      description: prefixedDescription,
      color: EMBED_COLOR,
      fields,
    },
  };

  return msg.channel.createMessage(botContent, null, msg);
}

module.exports = {
  uniqueId: 'help',
  commandAliases: ALIASES,
  action(bot, msg, suffix, monochrome) {
    const helpCommandHelper = monochrome.getCommandManager().getHelpCommandHelper();

    const commandsForTopLevelHelp = getCommandsForTopLevelHelpInOrder(
      helpCommandHelper.getNonHiddenCommands(),
      COMMANDS_TO_GENERATE_HELP_FOR,
    );

    commandsForTopLevelHelp.forEach(validateCommand);

    const persistence = monochrome.getPersistence();
    const prefix = persistence.getPrimaryPrefixForMessage(msg);
    if (suffix) {
      return showAdvancedHelp(msg, suffix, helpCommandHelper, prefix);
    }
    return showGeneralHelp(msg, helpCommandHelper, prefix);
  },
};

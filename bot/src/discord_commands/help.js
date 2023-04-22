const { FulfillmentError, Permissions, PaginatedMessage } = require('monochrome-bot');
const constants = require('../common/constants.js');

// Configuration start

const MAX_COMMANDS_PER_PAGE = 8;
const EMBED_COLOR = constants.EMBED_NEUTRAL_COLOR;
const ALIASES = ['help', 'h'];
const WEB_COMMANDS_URI = 'https://kotobaweb.com/bot'; // If you have commands documentation on the web
const EMBED_TITLE = 'Kotoba';
const EMBED_ICON_URI = constants.FOOTER_ICON_URI;

const COMMANDS_TO_GENERATE_HELP_FOR = [
  'jisho',
  'kanji',
  'strokeorder',
  'quiz',
  'jibiki',
  'weblio',
  'shiritori',
  'examples',
  'translate',
  'furigana',
  'hispadic',
  'yourei',
  'anime',
  'shiritoriforever',
  'random',
  'pronounce',
  'jukebox',
  'jn',
  'invite',
  'settings',
  'about',
];

const linksField = {
  name: 'Links',
  value: '[Support Server](https://discord.gg/S92qCjbNHt) | [Web](https://kotobaweb.com/bot) | [GitHub](https://github.com/mistval/kotoba)',
};

// Configuration end

const PREFIX_REPLACE_REGEX = /<prefix>/g;

const showAllHelpMockCommand = {
  aliases: [`${ALIASES[0]} all`],
  shortDescription: 'Show all commands on one page (good for pinning but long as xxx)',
};

function validateCommand(command) {
  const commandName = command.aliases[0];
  if (command.shortDescription && typeof command.shortDescription !== typeof '') {
    throw new Error(`The shortDescription must be a string. It is not for ${commandName}`);
  } else if (command.usageExample && typeof command.usageExample !== typeof '') {
    throw new Error(`The usageExample must be a string. It is not for ${commandName}`);
  } else if (command.longDescription && typeof command.longDescription !== typeof '') {
    throw new Error(`The longDescription must be a string. It is not for ${commandName}`);
  } else if (
    command.aliasesForHelp
    && (!Array.isArray(command.aliasesForHelp) || command.aliasesForHelp.length < 1)
  ) {
    throw new Error(`The aliasesForHelp must be an array. It is not for ${commandName}`);
  }
}

function prefixAliases(aliases, prefix) {
  return aliases.map((alias) => `${prefix}${alias}`);
}

function createFieldForCommand(command, prefix) {
  validateCommand(command);
  const aliases = command.aliasesForHelp || command.aliases;
  const prefixedAliases = prefixAliases(aliases, prefix);
  const firstPrefixedAlias = prefixedAliases[0];
  const otherPrefixedAliases = prefixedAliases.slice(1);

  const shortAliasesStringPart = otherPrefixedAliases.length > 0
    ? ` (short: ${otherPrefixedAliases.join(', ')})`
    : '';

  const exampleStringPart = command.usageExample
    ? `\n__Example:__ **${command.usageExample.replace(PREFIX_REPLACE_REGEX, prefix)}**`
    : '';

  return {
    name: `${firstPrefixedAlias}${shortAliasesStringPart}`,
    value: `${command.shortDescription.replace(PREFIX_REPLACE_REGEX, prefix)}${exampleStringPart}`,
  };
}

function createPagesForCommands(commands, commandMessage, paginate) {
  if (commands.length === 0) {
    return undefined;
  }

  const commandsCopy = commands.slice();
  const maxCommandsPerPage = paginate ? MAX_COMMANDS_PER_PAGE : Number.MAX_SAFE_INTEGER;
  if (commandsCopy.length > maxCommandsPerPage) {
    commandsCopy.splice(maxCommandsPerPage - 1, 0, showAllHelpMockCommand);
  }

  const numPages = Math.max(1, Math.ceil(commandsCopy.length / maxCommandsPerPage));
  const prefixedHelpCommand = `${commandMessage.prefix}${ALIASES[0]}`;
  const pages = [];

  for (let startIndex = 0; startIndex < commandsCopy.length; startIndex += maxCommandsPerPage) {
    const pageNumber = (startIndex / maxCommandsPerPage) + 1;
    const endIndex = startIndex + maxCommandsPerPage;
    const fields = commandsCopy
      .slice(startIndex, endIndex)
      .map((command) => createFieldForCommand(command, commandMessage.prefix));

    const embed = {
      description: `Say **${prefixedHelpCommand} CommandNameHere** to see more information about a specific command.`,
      author: {
        name: `${EMBED_TITLE} (page ${pageNumber} of ${numPages})`,
        icon_url: EMBED_ICON_URI,
        url: WEB_COMMANDS_URI,
      },
      url: WEB_COMMANDS_URI,
      fields,
      color: EMBED_COLOR,
    };

    pages.push({ embed });
  }

  pages[0].embed.fields.push(linksField);

  return pages;
}

function indexOfAliasInList(command, list) {
  return list.findIndex((alias) => command.aliases.indexOf(alias) !== -1);
}

function compareCommandOrder(commandA, commandB, orderList) {
  return indexOfAliasInList(commandA, orderList) - indexOfAliasInList(commandB, orderList);
}

function getCommandsForTopLevelHelpInOrder(nonHiddenCommands, generationOrder) {
  return nonHiddenCommands
    .filter((command) => indexOfAliasInList(command, generationOrder) !== -1)
    .sort((a, b) => compareCommandOrder(a, b, generationOrder));
}

async function showGeneralHelp(monochrome, msg, paginate) {
  const helpCommandHelper = monochrome.getCommandManager().getHelpCommandHelper();
  const enabledNonHiddenCommands = await helpCommandHelper.getEnabledNonHiddenCommands(msg);
  const commandsToDisplayHelpFor = getCommandsForTopLevelHelpInOrder(
    enabledNonHiddenCommands,
    COMMANDS_TO_GENERATE_HELP_FOR,
  );

  const pages = createPagesForCommands(commandsToDisplayHelpFor, msg, paginate);
  if (pages) {
    const interactiveMessageId = 'help';
    return PaginatedMessage.sendAsMessageReply(msg, [{ title: '', pages }], { id: interactiveMessageId });
  }

  throw new FulfillmentError({
    publicMessage: 'There are no commands to show help for. Perhaps the server admins disabled all my commands in this channel.',
    logDescription: 'No commands to display',
  });
}

function showAdvancedHelp(monochrome, msg, targetAlias) {
  const helpCommandHelper = monochrome.getCommandManager().getHelpCommandHelper();
  const command = helpCommandHelper.findCommand(
    targetAlias,
    msg.channel.guild ? msg.channel.guild.id : msg.channel.id,
  );

  if (!command) {
    return showGeneralHelp(monochrome, msg, true);
  }

  const unprefixedDescription = command.longDescription || command.shortDescription;
  if (!unprefixedDescription) {
    return showGeneralHelp(monochrome, msg, true);
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
  if (command.aliases.length > 1) {
    fields.push({
      name: 'Aliases',
      value: command.aliases.slice(1).map((alias) => `${msg.prefix}${alias}`).join(', '),
      inline: true,
    });
  }
  if (command.usageExample) {
    fields.push({ name: 'Usage example', value: command.usageExample.replace(PREFIX_REPLACE_REGEX, msg.prefix) });
  }

  const prefixedDescription = unprefixedDescription.replace(PREFIX_REPLACE_REGEX, msg.prefix);

  const botContent = {
    embed: {
      title: `${msg.prefix}${command.aliases[0]}`,
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
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  shortDescription: 'Show a list of commands or get advanced help for a specific command.',
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'command',
      description: 'The name of a command to get advanced help for',
      type: 3,
      choices: COMMANDS_TO_GENERATE_HELP_FOR.map((commandName) => ({
        name: commandName,
        value: commandName,
      })),
    }],
  },
  action(bot, msg, suffix, monochrome) {
    const isDm = !msg.channel.guild;
    const canPaginate = isDm || msg.channel.permissionsOf(bot.user.id).json.addReactions;
    const paginate = canPaginate && suffix.indexOf('all') === -1;
    const suffixReplaced = suffix.replace(/all/g, '');

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    if (suffixReplaced) {
      return showAdvancedHelp(monochrome, msg, suffixReplaced);
    }
    return showGeneralHelp(monochrome, msg, paginate);
  },
};

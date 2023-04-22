const globals = require('../../common/globals.js');
const retryPromise = require('../../common/util/retry_promise.js');

const AUTO_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour

const interactiveMessageForMessageId = new Map();

class InteractiveMessage {
  constructor(ownerId) {
    this.ownerId = ownerId;
  }

  setComponents(componentGroup) {
    this.components = componentGroup;
    this.componentForId = this.components && Object.fromEntries(
      componentGroup.flatMap((group) => group.components)
        .map((component) => [component.custom_id, component]),
    );
  }

  setEmbed(embed) {
    this.embed = embed;
  }

  async disableInteraction() {
    if (!this.messagePromise) {
      return;
    }

    const message = await this.messagePromise;
    interactiveMessageForMessageId.delete(message.id);
    this.setComponents([]);
    await this.sendOrUpdate();
  }

  async sendOrUpdate(channel) {
    if (this.messagePromise) {
      return retryPromise(async () => (await this.messagePromise).edit({
        embed: this.embed,
        components: this.components,
      }));
    }

    this.messagePromise = retryPromise(() => channel.createMessage({
      embed: this.embed,
      components: this.components,
    }));

    const message = await this.messagePromise;
    interactiveMessageForMessageId.set(message.id, this);

    setTimeout(async () => {
      try {
        await this.disableInteraction();
      } catch (err) {
        globals.logger.warn({
          event: 'FAILED TO DISABLE INTERACTIVE MESSAGE',
          err,
        });
      }
    }, AUTO_TIMEOUT_MS);

    return message;
  }

  async handleInteraction(interaction) {
    if ((interaction.member ?? interaction.user)?.id !== this.ownerId) {
      return;
    }

    const component = this.componentForId[interaction.data.custom_id];

    if (!component) {
      return;
    }

    await component.action();
  }
}

async function handleInteraction(interaction) {
  const interactiveMessage = interactiveMessageForMessageId.get(interaction.message.id);

  if (!interactiveMessage) {
    return;
  }

  await interactiveMessage.handleInteraction(interaction);
  await interaction.acknowledge();
}

module.exports = {
  handleInteraction,
  InteractiveMessage,
};

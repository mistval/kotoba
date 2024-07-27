const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createTunnel } = require('tunnel-ssh');
// eslint-disable-next-line import/no-extraneous-dependencies,import/no-unresolved
const { MongoClient } = require('mongodb');

async function doUpdateMany(collection, filter, update) {
  const matchedDocumentCount = await collection.countDocuments(filter);
  console.log(`Found ${matchedDocumentCount} records in ${collection.collectionName}`);
  const result = await collection.updateMany(filter, update);
  console.log(`Updated ${result.modifiedCount} records in ${collection.collectionName}`);
}

async function doDeleteOne(collection, filter) {
  const result = await collection.deleteOne(filter);
  console.log(`Deleted ${result.deletedCount} records in ${collection.collectionName}`);
}

async function doUpdateOne(collection, filter, update) {
  const result = await collection.updateOne(filter, update);
  console.log(`Updated ${result.modifiedCount} records in ${collection.collectionName}`);
}

async function doDeleteMany(collection, filter) {
  const matchedDocumentCount = await collection.countDocuments(filter);
  console.log(`Found ${matchedDocumentCount} records in ${collection.collectionName}`);
  const result = await collection.deleteMany(filter);
  console.log(`Deleted ${result.deletedCount} records in ${collection.collectionName}`);
}

async function main() {
  const fromUserDiscordId = process.argv[2];
  const toUserDiscordId = process.argv[3];
  const serverIp = process.argv[4];
  const serverSshKeyPath = process.argv[5];

  if (!fromUserDiscordId || !toUserDiscordId) {
    console.warn('No user IDs provided');
    process.exit(2);
  }

  if (!serverIp) {
    console.warn('No server IP provided');
    process.exit(3);
  }

  if (!serverSshKeyPath) {
    console.warn('No server SSH key path provided');
    process.exit(4);
  }

  await createTunnel({
    autoClose: true,
  }, {
    port: 50001,
  }, {
    username: 'ubuntu',
    host: serverSshKeyPath,
    port: 22,
    privateKey: fs.readFileSync(serverSshKeyPath),
  }, {
    srcAddr: '127.0.0.1',
    dstAddr: '127.0.0.1',
    srcPort: 50001,
    dstPort: 50001,
  });

  const client = new MongoClient('mongodb://127.0.0.1:50001/kotoba');

  await client.connect();

  const usersCollection = client.db().collection('users');
  const customDecksCollection = client.db().collection('customdecks');
  const customDeckVotesCollection = client.db().collection('customdeckvotes');
  const monochromePersistenceCollection = client.db().collection('monochromepersistence');
  const userGlobalDeckScoresCollection = client.db().collection('userglobaldeckscores');
  const userGlobalTotalScoresCollection = client.db().collection('userglobaltotalscores');
  const userServerDeckScoresCollection = client.db().collection('userserverdeckscores');
  const userServerTotalScoresCollection = client.db().collection('userservertotalscores');

  const fromUserRecord = await usersCollection.findOne({ 'discordUser.id': fromUserDiscordId });

  if (!fromUserRecord) {
    console.warn(`User with Discord ID ${fromUserDiscordId} not found in users collection`);
    process.exit(3);
  }

  const toUserRecord = await usersCollection.findOne({ 'discordUser.id': toUserDiscordId });

  if (!toUserRecord) {
    console.warn(`User with Discord ID ${toUserDiscordId} not found in users collection`);
    process.exit(4);
  }

  const fromUserMongoId = fromUserRecord._id;
  const toUserMongoId = toUserRecord._id;

  await doUpdateMany(
    customDecksCollection,
    { owner: fromUserMongoId },
    { $set: { owner: toUserMongoId } },
  );

  await doUpdateMany(
    customDeckVotesCollection,
    { voter: fromUserMongoId },
    { $set: { voter: toUserMongoId } },
  );

  await doDeleteOne(
    monochromePersistenceCollection,
    { key: `User${toUserDiscordId}` },
  );

  await doUpdateOne(
    monochromePersistenceCollection,
    { key: `User${fromUserDiscordId}` },
    { $set: { user: `User${toUserDiscordId}` } },
  );

  await doDeleteMany(
    userGlobalDeckScoresCollection,
    { userId: toUserDiscordId },
  );

  await doUpdateOne(
    userGlobalDeckScoresCollection,
    { userId: fromUserDiscordId },
    { $set: { userId: toUserDiscordId } },
  );

  await doDeleteMany(
    userGlobalTotalScoresCollection,
    { userId: toUserDiscordId },
  );

  await doUpdateOne(
    userGlobalTotalScoresCollection,
    { userId: fromUserDiscordId },
    { $set: { userId: toUserDiscordId } },
  );

  await doDeleteMany(
    userServerDeckScoresCollection,
    { userId: toUserDiscordId },
  );

  await doUpdateOne(
    userServerDeckScoresCollection,
    { userId: fromUserDiscordId },
    { $set: { userId: toUserDiscordId } },
  );

  await doDeleteMany(
    userServerTotalScoresCollection,
    { userId: toUserDiscordId },
  );

  await doUpdateOne(
    userServerTotalScoresCollection,
    { userId: fromUserDiscordId },
    { $set: { userId: toUserDiscordId } },
  );

  console.log('Run these commands to complete the transfer');

  console.log(`find /home/ubuntu/kotoba/user_data/bot/quiz_saves -type f | xargs sed -i "s/${fromUserDiscordId}/${toUserDiscordId}/"`);
  console.log(`find /home/ubuntu/kotoba/user_data/bot/quiz_saves -type f | xargs sed -i "s/${fromUserMongoId}/${toUserMongoId}/"`);
  console.log(`find /home/ubuntu/kotoba/user_data/shared_data/custom_decks -type f | xargs sed -i "s/${fromUserDiscordId}/${toUserDiscordId}/"`);
  console.log(`find /home/ubuntu/kotoba/user_data/shared_data/custom_decks -type f | xargs sed -i "s/${fromUserMongoId}/${toUserMongoId}/"`);

  await client.close();
}

main();

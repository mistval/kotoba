const LOGGER_TITLE = 'MIGRATION';

async function migrateNameForUserToOwnKey(persistence, logger) {
  const data = { ...await persistence.getGlobalData() };
  if (!data.nameForUser) {
    return;
  }

  logger.logSuccess(LOGGER_TITLE, 'Migrating nameForUser from global to own key.');

  const { nameForUser } = data;
  await persistence.editData('nameForUserId', () => nameForUser);
  await persistence.editGlobalData((globalData) => {
    const newGlobalData = { ...globalData };
    delete newGlobalData.nameForUser;
    return newGlobalData;
  });
}

async function migrateQuizScoresToOwnKey(persistence, logger) {
  const data = { ...await persistence.getGlobalData() };
  if (!data.quizScores) {
    return;
  }

  logger.logSuccess(LOGGER_TITLE, 'Migrating quizScores from global to own key.');

  const { quizScores } = data;
  await persistence.editData('quizScores', () => quizScores);
  await persistence.editGlobalData((globalData) => {
    const newGlobalData = { ...globalData };
    delete newGlobalData.quizScores;
    return newGlobalData;
  });
}

async function performMigrations(monochrome) {
  const persistence = monochrome.getPersistence();
  const logger = monochrome.getLogger();

  await migrateQuizScoresToOwnKey(persistence, logger);
  await migrateNameForUserToOwnKey(persistence, logger);
}

module.exports = performMigrations;

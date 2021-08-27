import { quizTimeModifierPresets, quizDefaults } from 'kotoba-common';

export function convertRangeNumberToString(number) {
  if (number === Number.POSITIVE_INFINITY) {
    return 'end';
  }

  return number.toString();
}

export function convertRangeStringToNumber(string) {
  if (string === 'end') {
    return Number.POSITIVE_INFINITY;
  }

  return parseInt(string, 10);
}

export function createDeck(name, startIndex = 1, endIndex = Number.POSITIVE_INFINITY) {
  return { name, startIndex, endIndex };
}

export function createTimeModifierParts(timingArguments) {
  const presetEntries = Object.entries(quizTimeModifierPresets);
  for (let i = 0; i < presetEntries.length; i += 1) {
    const presetEntry = presetEntries[i];
    const [presetName, presetValues] = presetEntry;

    const matchesPreset = Object.entries(presetValues)
      .every(([presetKey, presetValue]) => timingArguments[presetKey] === presetValue);

    if (matchesPreset) {
      if (presetName === 'normal') {
        return [];
      }
      return [presetName];
    }
  }

  const parts = [];

  if (quizDefaults.answerTimeLimit !== timingArguments.answerTimeLimit) {
    parts.push(`atl=${timingArguments.answerTimeLimit}`);
  }
  if (quizDefaults.delayAfterUnansweredQuestion !== timingArguments.delayAfterUnansweredQuestion) {
    parts.push(`dauq=${timingArguments.delayAfterUnansweredQuestion}`);
  }
  if (quizDefaults.delayAfterAnsweredQuestion !== timingArguments.delayAfterAnsweredQuestion) {
    parts.push(`daaq=${timingArguments.delayAfterAnsweredQuestion}`);
  }
  if (quizDefaults.additionalAnswerWaitWindow !== timingArguments.additionalAnswerWaitWindow) {
    parts.push(`aaww=${timingArguments.additionalAnswerWaitWindow}`);
  }

  return parts;
}

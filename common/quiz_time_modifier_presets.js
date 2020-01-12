module.exports = {
  nodelay: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 0,
    delayAfterAnsweredQuestion: 0,
    additionalAnswerWaitWindow: 0,
  },
  faster: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: .8,
    delayAfterAnsweredQuestion: .8,
    additionalAnswerWaitWindow: .5,
  },
  fast: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 1.2,
    delayAfterAnsweredQuestion: 1.2,
    additionalAnswerWaitWindow: 1,
  },
  normal: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 3,
    delayAfterAnsweredQuestion: 2.2,
    additionalAnswerWaitWindow: 2,
  },
  slow: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 4.5,
    delayAfterAnsweredQuestion: 3,
    additionalAnswerWaitWindow: 3.7,
  },
};
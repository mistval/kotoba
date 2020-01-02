module.exports = {
  nodelay: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 0,
    delayAfterAnsweredQuestion: 0,
    additionalAnswerWaitWindow: 0,
  },
  faster: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 1,
    delayAfterAnsweredQuestion: 1,
    additionalAnswerWaitWindow: .7,
  },
  fast: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 1.5,
    delayAfterAnsweredQuestion: 1.5,
    additionalAnswerWaitWindow: 1.5,
  },
  normal: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 3,
    delayAfterAnsweredQuestion: 2.2,
    additionalAnswerWaitWindow: 2.1,
  },
  slow: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 4.5,
    delayAfterAnsweredQuestion: 3,
    additionalAnswerWaitWindow: 3.7,
  },
};
module.exports = {
  nodelay: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 0,
    delayAfterAnsweredQuestion: 0,
    additionalAnswerWaitWindow: 0,
  },
  faster: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: .75,
    delayAfterAnsweredQuestion: .75,
    additionalAnswerWaitWindow: 1,
  },
  fast: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 1,
    delayAfterAnsweredQuestion: 1,
    additionalAnswerWaitWindow: 1.5,
  },
  normal: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 3,
    delayAfterAnsweredQuestion: 2.25,
    additionalAnswerWaitWindow: 2.15,
  },
  slow: {
    answerTimeLimit: 16,
    delayAfterUnansweredQuestion: 4.5,
    delayAfterAnsweredQuestion: 3,
    additionalAnswerWaitWindow: 3.75,
  },
};
'use strict'
/**
* A simple repeating queue implementation. Used for status rotation. Popping an object does not remove it, but moves it to the back of the queue and returns it.
*/
class RepeatingQueue {
  /**
  * @param {array<Object>} array - The objects to queue.
  */
  constructor(array) {
    this.array_ = array.slice(0);
    this.index_ = 0;
  }

  /**
  * @returns {Object} The next item in the queue
  */
  pop() {
    let value = this.array_[this.index_];
    ++this.index_;
    if (this.index_ >= this.array_.length) {
      this.index_ = 0;
    }

    return value;
  }
}

module.exports = RepeatingQueue;

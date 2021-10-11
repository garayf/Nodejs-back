class Time {
  #start;
  #end;

  // Methods
  start() {
    this.#start = window.performance.now();
  }

  end() {
    this.#end = window.performance.now();
  }

  /**
   *
   * @param {number} ms - Milliseconds to be deducted from total recorded time.
   * @returns {number} - Return remaining milliseconds.
   */
  remaining(ms) {
    const total = Math.ceil(ms - (this.#end - this.#start));
    console.log(total);
    return total > 0 ? total : 0;
  }

  get ms() {
    return Math.ceil(this.end - this.start);
  }
}
module.exports = Time;

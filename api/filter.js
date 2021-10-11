class KnackFilter {
  #match;
  #rules = [];

  constructor(match = 'and') {
    this.#match = match;
  }

  get rules() {
    return {
      match: this.#match,
      rules: this.#rules,
    };
  }

  get parsedRules() {
    return encodeURIComponent(
      JSON.stringify({
        match: this.#match,
        rules: this.#rules,
      })
    );
  }

  /**
   * @param {"and"|"or"} match - Must either be and / or.
   */
  set match(match) {
    this.#match = match;
  }

  /**
   * @param {string} field - Name of the field.
   * @param {string} operator - Is" || "is not" || "contains" || "does not contain".
   * @param {string} value - You can also pass "type".
   * @param {string} range - Range.
   * @example ```js
   * const x = new KnackFilter()
   * x.addFilter
   * ```
   */
  addRule(field, operator, value, range) {
    if (!operator) throw Error('Must pass an operator as a second argument');
    if (!range) {
      this.#rules.push({
        field,
        operator,
        value,
      });
      return;
    }

    this.#rules.push({
      field,
      operator,
      type: value,
      range,
    });
  }
}

module.exports = KnackFilter;

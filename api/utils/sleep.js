function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}

module.exports = sleep;

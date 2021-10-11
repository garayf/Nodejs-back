const axios = require("axios");
const sleep = require("./utils/sleep");
const Time = require("./utils/Time");

class API {
  #api;

  constructor(appId, apiKey) {
    this.#api = axios.create({
      baseURL: "https://api.knack.com/v1/objects/",
      headers: {
        "X-Knack-Application-Id": appId,
        "X-Knack-REST-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  #setConfig = (method, url, data = {}, params = {}) => ({
    method,
    url,
    data,
    params,
  });
  #setUrl = (objNo) => `object_${objNo}/records`;

  #getPromiseResponses = async (pendings) => {
    const resolved = [];
    const failed = [];

    const requests = pendings.map((pending) => pending.request);
    const responses = await Promise.allSettled(requests);

    for (let i = 0; i < responses.length; i++) {
      if (responses[i].status === "fulfilled") {
        resolved.push(responses[i].value);
      } else {
        failed.push({
          payload: pendings[i].payload,
          reason: responses[i].reason,
        });
      }
    }
    return [resolved, failed];
  };

  getMany = async (objNo, filter = false, sort = false) => {
    const filters = filter ? `&filters=${filter}` : "";
    const sorts = sort ? `&sort=${sort}` : "";
    const url = `${this.#setUrl(objNo)}?rows_per_page=1000${filters}${sorts}`;
    const config = this.#setConfig("GET", url);

    try {
      const response = (await this.#api(config)).data;
      const records = response.records;

      if (response.total_pages > 1) {
        for (let i = 1; i < response.total_pages; i++) {
          const nextGroupUrl = url + `&page=${i + 1}`;
          const nextGroupConfig = this.#setConfig("GET", nextGroupUrl);
          const nextGroupRecords = (await this.#api(nextGroupConfig)).data
            .records;

          records.push(...nextGroupRecords);
        }
      }

      return records;
    } catch (error) {
      if (error?.response) throw error?.response?.data;
      throw error.message;
    }
  };

  /**
   * @author Matt Uy
   * @typedef Data
   * @type {object}
   * @property {string | undefined} id - Record id.
   * @property {object | undefined} payload - Record Payload.
   * @param {"GET" | "POST" | "PUT" | "DELETE"} method - Must be a string with a value of GET, POST, PUT or DELETE.
   * @param {number} objNo - Knack object number.
   * @param {Data} data - Methods GET, PUT and DELETE requires id property, methods POST and PUT requires payload property.
   * @example
   * // GET
   * const data = {
   *    id: "enter Knack id here"
   * }
   * api("GET", 1, data)
   *
   * // POST
   * const data = {
   *    payload: { ... }
   * }
   * api("POST", 2, data)
   *
   * // PUT
   * const data = {
   *    id: "enter Knack id here",
   *    payload: { ... }
   * }
   * api("PUT", 3, data)
   *
   * // DELETE
   * const data = {
   *    id: "enter Knack id here"
   * }
   * api("DELETE", 4, data)
   *
   * @returns {object} - Returns promise with the necessary payload.
   */
  api = async (method, objNo, data) => {
    const requriesId = ["GET", "DELETE", "PUT"];
    if (requriesId.includes(method) && !data?.id)
      throw new Error("data argument requires an object with id property");

    const url = data?.id
      ? this.#setUrl(objNo) + `/${data?.id}`
      : this.#setUrl(objNo);
    const config = this.#setConfig(method, url, data?.payload);
    try {
      return (await this.#api(config)).data;
    } catch (error) {
      if (error?.response) throw error?.response?.data;
      throw error.message;
    }
  };

  /**
   * @author Matt Uy
   * @param {"POST" | "PUT" | "DELETE"} method - Pass either POST, PUT or DELETE.
   * @param {number} objNo - Object number.
   * @param {object[]} data - Array of payload to be passed.
   * @returns {object} - Object with property success and failed.
   */
  bulk = async (method, objNo, data) => {
    // **** Validations ****
    // method arg:
    const acceptableMethods = ["POST", "PUT", "DELETE"];
    if (!acceptableMethods.includes(method)) {
      throw Error(
        "1st argument must a string with a value of POST, PUT or DELETE"
      );
    }
    // objNo arg:
    if (typeof objNo !== "number" && typeof objNo !== "string") {
      throw Error("2nd argument must be of data type number or string");
    }
    // data arg:
    if (!Array.isArray(data) || !data.length) {
      throw Error(
        "3rd argument must be an array that contains at least 1 object payload"
      );
    }
    if (method !== "POST" && !data.every((d) => d.id)) {
      throw Error("Error: One of the object is missing an id property");
    }

    const dataFormatted = [];
    for (let i = 0; i < data.length; i++) {
      if (method === "POST") {
        dataFormatted.push({ payload: data[i] });
      } else {
        const { id, ...payload } = data[i];
        dataFormatted.push({ id, payload });
      }
    }
    console.log("dataFormatted", dataFormatted);
    const timer = new Time();
    const success = [];
    const failed = [];

    let pendings = [];

    // Loop all dataFormatted and do one of the CUD operation
    for (let i = 0; i < dataFormatted.length; i++) {
      const data = dataFormatted[i];
      console.log("DATA:", data);
      pendings.push({
        payload: data.payload,
        request: await this.api(method, objNo, data),
      });

      const recordNo = i + 1;

      // Settle all if total request is less than 10 and reached end of the record
      if (
        (dataFormatted.length <= 10 && i === dataFormatted.length - 1) ||
        (recordNo % 10 !== 0 && i === dataFormatted.length - 1)
      ) {
        const [fullfiled, rejected] = await this.#getPromiseResponses(pendings);
        success.push(...fullfiled);
        failed.push(...rejected);
      }

      // Settle all promised when looping records reached 10
      if (dataFormatted.length > 10 && recordNo % 10 === 0) {
        timer.start(); // record start time

        const [fullfiled, rejected] = await this.#getPromiseResponses(pendings);
        success.push(...fullfiled);
        failed.push(...rejected);
        pendings = []; // Reset pendings

        timer.end(); // record end time
        const remaining = timer.remaining(1000);
        if (remaining > 0) await sleep(remaining); // wait for remaining time
      }
    }
    console.log("TIMER", timer);
    return { success, failed };
  };
}

module.exports = API;

/**
 * @module ApiTracker
 *
 * Log statistics for CDOGS Requests.
 *
 * @see morgan
 *
 * @exports initializeApiTracker
 */
const moment = require('moment');
const morgan = require('morgan');

const docGenUrl = '/api/v1/docGen';
const trackerUrls = [docGenUrl];

// add in any token (custom or morgan built-in) we want to the format, then morgan can parse out later
// status and response-time is a built-in morgan token
const apiTrackerFormat = ':operation :authorizedParty :timestamp :contextKeyCount :contentFileType :contentEncodingType :contentSize :outputFileType :res[content-length] :status :response-time';

const apiTracker = async (req, res, next) => {

  if (trackerUrls.includes(req.url)) {
    req._timestamp = moment.utc().valueOf();
    req._operation = req.url === docGenUrl ? 'DOCGEN' : 'Unknown';

    /*
    When/If we need to parse data out of the response, we would do it here...
    const defaultEnd = res.end;
    const chunks = [];
    res.end = (...restArgs) => {
        try {
            if (restArgs[0]) {
                chunks.push(Buffer.from(restArgs[0]));
            }
            const body = Buffer.concat(chunks).toString('utf8');
            const obj = JSON.parse(body);

        } catch (err) {
            log.error('mailApiTracker', err);
        }
        defaultEnd.apply(res, restArgs);
    };
    */
  }
  next();
};

const initializeApiTracker = (app) => {

  // register token parser functions.
  // this one would depend on authorizedParty middleware being loaded
  morgan.token('authorizedParty', (req) => {
    return req.authorizedParty ? req.authorizedParty : '-';
  });

  morgan.token('operation', (req) => {
    return req._operation ? req._operation : '-';
  });

  morgan.token('timestamp', (req) => {
    return req._timestamp ? req._timestamp : '-';
  });

  morgan.token('contextKeyCount', (req) => {
    function countKeys(source) {
      if (!source) return 0;
      let result = 0;
      (function count(obj) {
        if (Array.isArray(obj)) {
          obj.forEach(function (j) {
            count(j);
          });
        } else {
          Object.keys(obj).forEach(function (k) {
            result++;
            const v = obj[k];
            if (typeof v === 'object') {
              count(v);
            }
          });
        }
      })(source);
      return result;
    }

    try {
      // want to return some idea of the size/magnitude/complexity of the contexts
      const keyCount = countKeys(req.body.contexts);
      return keyCount;
    } catch (e) {
      return '-';
    }
  });

  morgan.token('contentFileType', (req) => {
    try {
      return req.body.template.contentFileType;
    } catch (e) {
      return '-';
    }
  });

  morgan.token('contentEncodingType', (req) => {
    try {
      return req.body.template.contentEncodingType;
    } catch (e) {
      return '-';
    }
  });

  morgan.token('contentSize', (req) => {
    try {
      const buf = Buffer.from(req.body.template.content, req.body.template.contentEncodingType);
      return buf.length;
    } catch (e) {
      return '0';
    }
  });

  morgan.token('outputFileType', (req) => {
    try {
      return req.body.template.outputFileType;
    } catch (e) {
      return '-';
    }
  });

  app.use(morgan(apiTrackerFormat, {
    // eslint-disable-next-line no-unused-vars
    skip: function (req, res) {
      return !trackerUrls.includes(req.baseUrl);
    },
    stream: {
      write: (s) => {
        if (s && s.trim().length > 0) process.stdout(`CDOGS_API_TRACKER ${s.trim()}`);
      }
    }
  }));

  app.use(apiTracker);

};

module.exports = initializeApiTracker;

const log = require('npmlog');
const carbone = require('carbone');
const stream = require('stream');
const tmp = require('tmp');
const fs = require('fs');

const docGen = {
  /** Generate a file using carbone to merge data into the supplied document template
   *  @param {object} body The request body
   *  @param {object} response The server response to write the generated file to
   */
  generateDocument: async (body, response) => {
    tmp.setGracefulCleanup();
    let tmpFile = undefined;
    try {
      tmpFile = tmp.fileSync();
      if (!body.template.contentEncodingType) {
        body.template.contentEncodingType = 'base64';
      }
      await fs.promises.writeFile(tmpFile.name, Buffer.from(body.template.content, body.template.contentEncodingType));
      log.debug(JSON.stringify(tmpFile));

      // If it's not an array of multiple data items, pass it into carbone as a singular object
      const data = body.contexts.length > 1 ? body.contexts : body.contexts[0];
      carbone.render(tmpFile.name, data, function (err, result) {
        if (err) {
          log.error(`Error during Carbone generation. Error: ${err}`);
          throw new Error(err);
        }
        // write the result
        var readStream = new stream.PassThrough();
        readStream.end(result);

        response.set('Content-disposition', 'attachment; filename=test');
        response.set('Content-Type', 'text/plain');

        readStream.pipe(response);
        // Doc is generated at this point, remove the input file
        tmpFile.removeCallback();
      });
    } catch (e) {
      // something wrong (disk i/o?), log out and REMOVE THE TEMP FILE
      log.error(`Error handling file. ${e.message}`);
      if (tmpFile) {
        tmpFile.removeCallback();
      }
      throw e;
    }
  }
};

module.exports = docGen;

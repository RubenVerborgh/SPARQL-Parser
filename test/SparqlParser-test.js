var SparqlParser = require('../lib/SparqlParser');

var fs = require('fs'),
    expect = require('chai').expect;

var queriesPath = __dirname + '/../queries/';
var parsedQueriesPath = __dirname + '/../test/parsedQueries/';

describe('A SparqlParser instance', function () {
  var sparqlParser = new SparqlParser();

  fs.readdirSync(queriesPath).forEach(function (queryFile) {
    it('should correctly parse ' + queryFile, function () {
      var query = fs.readFileSync(queriesPath + queryFile, 'utf8');
      var parsedQueryFile = parsedQueriesPath + queryFile.replace('.sparql', '.json');
      var parsedQuery = JSON.parse(fs.readFileSync(parsedQueryFile, 'utf8'));
      expect(sparqlParser.parse(query)).to.deep.equal(parsedQuery);
    });
  });
});

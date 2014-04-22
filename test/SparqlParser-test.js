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

  it('should throw a SparqlSyntaxError on an invalid query', function () {
    var query = 'invalid', error = null;
    try { sparqlParser.parse(query); }
    catch (e) { error = e; }

    expect(error).to.exist;
    expect(error).to.be.an.instanceof(SparqlParser.SparqlSyntaxError);
    expect(error).to.have.property('message', 'Syntax error in SPARQL query: Expected [2] Query or [30] Update but "i" found.');
    expect(error).to.have.property('query', query);
  });
});

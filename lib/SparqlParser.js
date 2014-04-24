var RdfJsSparqlParser = require('../external/sparql-parser/src/sparql_parser.js')
                               .SparqlParser.parser;
var assert = require('assert'),
    util = require('util');

// Creates a new SparqlParser
function SparqlParser(prefixes) {
  this._prefixes = prefixes || Object.create(null);
}
var prototype = SparqlParser.prototype;

// Parses the given query text
prototype.parse = function (query) {
  var queryToken;
  try { queryToken = RdfJsSparqlParser.parse(query); }
  catch (error) { throw new SparqlSyntaxError(error.message, query); }
  return this._transformQuery(queryToken, this._prefixes);
};

// Transforms a query
prototype._transformQuery = function (queryToken, prefixes) {
  assert.equal(queryToken.kind, 'query');
  assert.equal(queryToken.units.length, 1);

  var newPrefixes = this._transformPrefixes(queryToken.prologue, prefixes);

  // Parse query structure
  var queryUnit = queryToken.units[0], query;
  switch (queryUnit.kind) {
  case 'select':
    query = this._transformSelectQuery(queryUnit, newPrefixes);
    break;
  case 'construct':
    query = this._transformConstructQuery(queryUnit, newPrefixes);
    break;
  default:
    throw new Error('Unsupported query type: ' + queryUnit.kind);
  }
  // Parse query pattern
  query.patterns = this._transformGroupGraphPattern(queryUnit.pattern, newPrefixes);
  // Parse filters
  if (queryUnit.pattern.filters && queryUnit.pattern.filters.length)
    query.filters = queryUnit.pattern.filters.map(function (filter) {
      return this._transformFilter(filter, newPrefixes);
    }, this);
  return query;
};

// Transforms prefixes
prototype._transformPrefixes = function (prologueToken, currentPrefixes) {
  var newPrefixes = Object.create(currentPrefixes);
  assert.equal(prologueToken.token, 'prologue');
  prologueToken.prefixes.forEach(function (prefixToken) {
    assert.equal(prefixToken.token, 'prefix');
    newPrefixes[prefixToken.prefix] = prefixToken.local;
  });
  return newPrefixes;
};

// Transforms a SELECT query
prototype._transformSelectQuery = function (queryToken, prefixes) {
  assert.equal(queryToken.kind, 'select');
  var variables = queryToken.projection.map(function (variableToken) {
    if (variableToken.kind === '*')
      return '*';
    assert.equal(variableToken.kind, 'var');
    return '?' + variableToken.value.value;
  });
  return {
    type: 'SELECT',
    variables: variables,
  };
};

// Transforms a CONSTRUCT query
prototype._transformConstructQuery = function (queryToken, prefixes) {
  assert.equal(queryToken.kind, 'construct');
  return {
    type: 'CONSTRUCT',
    template: queryToken.template.triplesContext.map(function (triple) {
      return this._transformTriplePattern(triple, prefixes);
    }, this),
  };
};

// Transforms a pattern
prototype._transformPattern = function (patternToken, prefixes) {
  switch (patternToken.token) {
  case 'groupgraphpattern':
    return this._transformGroupGraphPattern(patternToken, prefixes);
  case 'basicgraphpattern':
    return this._transformBasicGraphPattern(patternToken, prefixes);
  case 'graphunionpattern':
    return this._transformGraphUnionPattern(patternToken, prefixes);
  case 'optionalgraphpattern':
    return this._transformOptionalGraphPattern(patternToken, prefixes);
  default:
    throw new Error('Unsupported pattern type: ' + patternToken.token);
  }
};

// Transforms a group graph pattern
prototype._transformGroupGraphPattern = function (patternToken, prefixes) {
  assert.equal(patternToken.token, 'groupgraphpattern');
  return patternToken.patterns.map(function (patternToken) {
    return this._transformPattern(patternToken, prefixes);
  }, this);
};

// Transforms a basic graph pattern
prototype._transformBasicGraphPattern = function (patternToken, prefixes) {
  assert.equal(patternToken.token, 'basicgraphpattern');
  return {
    type: 'BGP',
    triples: patternToken.triplesContext.map(function (triple) {
      return this._transformTriplePattern(triple, prefixes);
    }, this),
  };
};

// Transforms a graph union pattern
prototype._transformGraphUnionPattern = function (patternToken, prefixes) {
  assert.equal(patternToken.token, 'graphunionpattern');
  assert.equal(patternToken.value.length, 2);
  var patternA = this._transformPattern(patternToken.value[0], prefixes);
  var patternB = this._transformPattern(patternToken.value[1], prefixes);
  // Flatten a possible sequence of unions
  if (patternA.type === 'UNION') patternA = patternA.patterns;
  return {
    type: 'UNION',
    patterns: [].concat(patternA, patternB),
  };
};

// Transforms an optional graph pattern
prototype._transformOptionalGraphPattern = function (patternToken, prefixes) {
  assert.equal(patternToken.token, 'optionalgraphpattern');
  return {
    type: 'OPTIONAL',
    patterns: this._transformPattern(patternToken.value, prefixes),
  };
};

// Transforms a basic triple pattern
prototype._transformTriplePattern = function (triple, prefixes) {
  return {
    subject:   this._transformNode(triple.subject,   prefixes),
    predicate: this._transformNode(triple.predicate, prefixes),
    object:    this._transformNode(triple.object,    prefixes),
  };
};

// Transforms a node (IRI, literal, or variable)
prototype._transformNode = function (node, prefixes) {
  switch (node.token) {
  case 'var':
    return '?' + node.value;
  case 'uri':
    if (node.prefix) {
      if (!(node.prefix in prefixes))
        throw new Error('Unknown prefix: ' + node.prefix);
      return prefixes[node.prefix] + node.suffix;
    }
    return node.value;
  case 'literal':
    if (node.lang)
      return '"' + node.value + '"@' + node.lang;
    if (node.type)
      return '"' + node.value + '"^^<' + node.type + '>';
    return '"' + node.value + '"';
  case 'blank':
    return '_:' + node.value;
  default:
    throw new Error('Unsupported token type: ' + node.token);
  }
};

// Transforms a filter
prototype._transformFilter = function (filterToken, prefixes) {
  var filter = filterToken.value;
  switch (filter.token) {
    case 'expression':
      return this._transformExpression(filter);
    default:
      throw new Error('Unsupported filter type: ' + filter.token);
  }
};

// Transforms an expression
prototype._transformExpression = function (expression, prefixes) {
  switch (expression.expressionType) {
    case 'atomic':
      switch (expression.primaryexpression) {
      case 'var':
        return { type: 'variable', value: '?' + expression.value.value };
      case 'numericliteral':
        return { type: 'number', value: parseFloat(expression.value.value) };
      default:
        throw new Error('Unsupported expression type: ' + expression.primaryexpression);
      }
    case 'relationalexpression':
      var operatorName = operatorNames[expression.operator];
      if (!operatorName)
        throw new Error('Unsupported relational operator: ' + expression.operator);
      return {
        type: 'operator',
        operator: operatorName,
        arguments: [
          this._transformExpression(expression.op1, prefixes),
          this._transformExpression(expression.op2, prefixes),
        ]
      };
    default:
      throw new Error('Unsupported expression type: ' + expression.expressionType);
  }
};

// Expression operators and their corresponding names
var operatorNames = {
  '<': 'lessThan',
  '>': 'greaterThan',
};

// Creates a new SparqlSyntaxError
function SparqlSyntaxError(message, query) {
  Error.call(this);
  this.name = 'SparqlSyntaxError';
  this.message = 'Syntax error in SPARQL query: ' + message;
  this.query = query;
}
util.inherits(SparqlSyntaxError, Error);

module.exports = SparqlParser;
SparqlParser.SparqlSyntaxError = SparqlSyntaxError;

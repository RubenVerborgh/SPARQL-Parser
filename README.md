# JavaScript SPARQL parser

SPARQL parser using [rdfstore-js](https://github.com/antoniogarrote/rdfstore-js) code,
outputting an [N3.js](https://github.com/RubenVerborgh/N3.js)-compatible format.

## Warning: beta code
The only SPARQL parser in JavaScript at the moment is part of [rdfstore-js](https://github.com/antoniogarrote/rdfstore-js).
rdfstore-js is known for its extensive feature set, but _not_ for [high maintenance](https://github.com/antoniogarrote/rdfstore-js/commits/master) or [being bug-free](https://github.com/RubenVerborgh/SPARQL-Parser/issues/1).

The `sparql-parser` module, which you are looking at right now,
is a wrapper around the rdfstore-js code.
It is much smaller library than rdfstore-js,
and it outputs a simpler tree structure.
However, it inherits (most of) the features _and_ bugs of rdfstore-js.
So while I am very thankful to the author of rdfstore-js,
I cannot personally guarantee the same industry-strength quality level of my other libraries
such as [N3.js](https://github.com/RubenVerborgh/N3.js),
because I did not write and test the core module of this package.

Some day, I hope to implement a JavaScript SPARQL parser,
but I don't know when or whether that will happen.

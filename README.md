# jazzle (a.k.a jsRube)

[![Join the chat at https://gitter.im/JazzleWare/jazzle-parser](https://badges.gitter.im/icefapper/jsRube.svg)](https://gitter.im/icefapper/jsRube?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
A small, simple, and ridiculously fast parser for all versions of ECMAScript/Javascript, written in plain ECMAScript3, on which I have been working on and [off](https://github.com/nodejs/node/issues/5900) since September 2015, under codename 'lube'.

A bug in v8 (and consequently in node) made it very difficult to run on node versions 5 and below. The bug has been resolved, and it now runs smoothly (and fater than any other parser I know of) in node v6.2.0+. Please bear this notice in mind while trying to use this parser. 

#Features
It always records the location data, range data, and raw value of every node, and still it parses jQuery-1.4.2 2x or 3.5x faster than esprima 2.7.2, depending, respectively, on whether the latter doesn't record the location/ranges or it does.
Funnily enough, it does all the above while keeping track of as much early errors as I could find in the spec.

It is almost completely esprima-compatible (except when things get annoying, in which case it is acorn-compatible).

#Future
My take is that, awesome as the parser is, it can still be more robust, and more low-power; even if it hits limits in the previous criteria, I'm still aiming to make it catch all of the spec's early errors, and i am intending to make it so in a matter of weeks, i.e, not even months.

#Using in the browser
Include the file `./dist/jazzle.js` in a `<script>` tag. It exposes the `Parser` constructor, and `parse` utility function. One use case could be:
```js
var code = 'sample(code);';
var result;

result = new Parser(code).parseProgram();

// or alternatively
result = parse(code)
```

#Building
In jazzle repository's root, run the build script, i.e., `./build-and-test.js`; 

```sh
node ./build-and-test.js
```

It bundles the sources under the 'src' directory in to a single file, to be found under `dist/lube.js`.
It also runs a self-test after bundling is complete; the parser should only be used if the test stage passes without any errors.

#Quick Testing
Even though a thorough test is performed during the build process (that is, while building via `build-and-test.js`), quick tests occasionally come in handy. To run quick tests, do:

```sh
 node quick-test.js
```

#Benchmarking
Before beginning to run a benchmark, make sure you have 'esprima', 'acorn', and 'benchmark' packages installed; if it is not the case, install them this way:
```sh
npm install esprima@latest
npm install acorn@latest
npm install benchmark@latest
```

Then run the actual benchmarking facility this way:

```sh
 node quick-bench.js
```

This will feed the corpus located under `sources` into each parser, asks them to parse each file while recording node location data, collects the timings for each parser, and prints the results.

#Using jazzle via npm
First,
```sh
npm install jazzle
```

Then:

```javascript
var jazzle = require( 'jazzle' );
console.log( jazzle.parse('var v = "hi !";') );
```

#anything else
Thanks a lot reading this far.


// Run JavaScript tests for Evolu Lang in Node.js

require.paths.unshift('spec', 'lib')
require('jspec')
require('evolu-lang')

JSpec.
  exec('spec/tests/language.js').
  exec('spec/tests/code.js').
  exec('spec/tests/standard.js').
  exec('spec/tests/integration.js').
  run({ reporter: JSpec.reporters.Terminal }).report()

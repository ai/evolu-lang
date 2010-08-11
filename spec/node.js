// Run Evolu.js tests in Node.js

require.paths.unshift('spec', 'lib')
require('jspec')
require('evolu')

JSpec.
  exec('spec/unit/language.js').
  exec('spec/unit/code.js').
  exec('spec/unit/standard.js').
  run({ reporter: JSpec.reporters.Terminal }).report()

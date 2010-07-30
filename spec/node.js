require.paths.unshift('spec', 'lib')
require('jspec')
require('evolu')

JSpec.
  exec('spec/unit/language.js').
  run({ reporter: JSpec.reporters.Terminal }).report()

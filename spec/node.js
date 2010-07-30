require.paths.unshift('spec', 'lib')
require('jspec')
require('evolu')

JSpec.
  run({ reporter: JSpec.reporters.Terminal }).report()

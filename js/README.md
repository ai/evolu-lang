# Evolu.js

Evolu.js is a JavaScript implementation of virtual machine to execute programs
on Evolu programming language.

## How To

For example, we will generate program (by genetic programming), which calculate
`tick` signals and on `result` signal it will send `even` or `odd` ticks it
received.

### Language

Like XML, Evolu is just a syntax format. So you need to define language for your
task by `evolu.lang(name, initializer)` function. It receive language name
(to use it in program prefix to storage and transfer programs) and function,
(which add language commands to `this`) and return new language.

For common cases you can use standard commands pack, and you need only to define
input/output signals.

    var lang = evolu.lang('EVEN-ODD', function() {
        this.add(evolu.standard.input('tick', 'result'))
        this.add(evolu.standard.output('even', 'odd'))
        lang.add(evolu.standard.variables)
    })

### Population

Get any genetic algorithm library or write it by yourself. Use bytes array
(array of integers from `0` to `255`, for example `[0, 255, 13, 68, 145]`) as
genes.

    var population = []
    // Add 100 genes to first population
    for (var i = 0; i < 100; i++) {
        var gene = []
        // Each gene will have random length
        while (Math.random < 0.9) {
            // Add random byte to current gene
            gene.push(Math.round(255 * Math.random()))
        }
    }

### Mutation

*Note, that integers in array must be from `0` to `255`.*

In genetic algorithm you can use any types of mutation for byte stream (a lot of
libraries contain them). You can add, change, delete, move bytes in array.

You can use crossover to mix arrays or just move part of bytes from one array
to another (like horizontal gene transfer).

### Selection

To calculate fitness for each gene in population, you need to compile each bytes
array:

    var program = lang.compile(population[i])

Send data to program and check its output data to calculate fitness. It’s like
automatically unit testing, but you test must return score, not just pass/fail.

If you use standard commands pack, you can use `receive_signal` event to listen
output signals and `signal` function to send input signals:

    output = []
    program.listen('receive_signal', function(signal) {
        output.push(signal)
    })
    
    program.signal('tick').signal('tick').signal('result')
    // Some hypothetical API
    check(output).to_contain('even')
    
    output = []
    program.signal('tick').signal('result')
    check(output).to_contain('odd')

### Saving

When you generate program for your demands, you can save it to disk or send to
server:

    var source = bestProgram.toSource()

Source is a string with `EVOLU:` and language name in prefix. For example,
`"EVOLU:EVEN-ODD:\x04\x80\x00\x01\x80\x03\x80\x05…"`.

You use `evolu.compile(string)` to automatically find language and compile bytes
to program:

    bestProgram == evolu.compile(bestProgram.toSource())

## License

Evolu.js is licensed under the GNU Lesser General Public License version 3.
See the LICENSE file or http://www.gnu.org/licenses/lgpl.html.

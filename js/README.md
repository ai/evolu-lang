# Evolu Lang for JS

Evolu Lang is a programming language to automatically generate programs by
evolution (genetic programming) and  has a JavaScript implementation of virtual
machine to execute this generated programs.

## How To

For example, we will generate program (by genetic programming), which calculates
`tick` signals and on `result` signal it sends whether an `even` or an `odd`
tick count it received.

### Language

Like XML, Evolu Lang is just a syntax format. So you need to define a language
for your task using the `evolu.lang.add(name, initializer)` function.
It receives a language name (to use it as a prefix in the source code for
storing and transferring the program) and function (which adds the language
commands to `this`), and returns a new language.

For the common cases you can use the standard commands pack, and you only need
to define the input/output signals.

    var lang = evolu.lang.add('EVEN-ODD', function() {
        this.add(evolu.lang.standard.input('tick', 'result'))
        this.add(evolu.lang.standard.output('even', 'odd'))
        lang.add(evolu.lang.standard.variables)
    })

### Population

Get any genetic algorithm library or write it by yourself. Use a byte array
(array of integers from `0` to `255`, for example `[0, 255, 13, 68, 145]`) as
genes.

    var population = []
    // Add 100 genes to the first population
    for (var i = 0; i < 100; i++) {
        var gene = []
        // Each gene will have random length
        while (Math.random < 0.9) {
            // Add a random byte to the current gene
            gene.push(Math.round(255 * Math.random()))
        }
    }

### Mutation

*Note that the integers in an array must be from `0` to `255`.*

In the genetic algorithm you can use any types of mutation for a byte stream
(a lot of libraries contain them). You can add, change, delete and
move bytes in the array.

You can use crossover to mix arrays or just move a part of bytes from one array
to another (like horizontal gene transfer).

### Selection

To calculate fitness for each gene in the population, you need to compile
each byte array:

    var program = lang.compile(population[i])

Send the data to the program and check its output data to calculate fitness.
It’s like automatic unit testing, but your test must return a score,
not just a pass/fail result.

If you use the standard commands pack, you can use the `receive_signal` event
to listen output signals and the `signal` function to send input signals:

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

When you generate a program for your demands, you can save it to a disk or send
to a server:

    var source = bestProgram.toSource()

Source is a string with `EVOLU:` and a language name in prefix. For example,
`"EVOLU:EVEN-ODD:\x04\x80\x00\x01\x80\x03\x80\x05…"`.

Use `evolu.lang.compile(string)` to automatically find a language (using the source
prefix) and compile the bytes into a program:

    bestProgram == evolu.lang.compile(bestProgram.toSource())

## License

Evolu Lang for JS is licensed under the GNU Lesser General Public License version 3.
See the LICENSE file or http://www.gnu.org/licenses/lgpl.html.

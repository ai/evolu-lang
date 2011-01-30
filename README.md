# Evolu Lang

Evolu Lang is a programming language to automatically generate programs by
evolution (genetic programming). Generator (genetic algorithm, particle swarm
optimization or other) will use Evolu Lang to compile bytes with random
mutations (gene) to program, run and test it.

It is created to be readable by human beings (instead of
artificial neural networks) and easily editable and mixable for genetic
algorithm (instead of tree structure and modern production languages).

## How It Works

A developer defines commands by Evolu Lang to create a business specific
language (or uses the standard commands pack) and defines tests (*fitness*),
to determine what program he or she wants to create.

In the next step he or she uses a generator, which uses a genetic algorithm,
particle swarm optimization or other evolutionary algorithms.
In the simplest case:
1. Generator creates an array (*population*) with random bytes (*genes*).
2. It adds random changes (*mutation*) to each byte stream in this array.
3. It compiles each of these random byte streams by Evolu Lang and runs
   obtained programs with tests.
4. Bad programs will be deleted and best programs will be copied to the
   population.
5. Generator returns to step 2 until an obtained program passes all of the
   tests.

## Features

* It is similar to usual programming languages with variables, commands, blocks
  and conditions.
* Simple and explicit code. If you change one byte of code, you will change one
  command or parameter in program. If you just join two half parts of two
  different programs, you will get algorithm with properties of both parts.
* Program is coded to a byte stream, so you can use a lot of libraries to mutate
  programs. Of course, you can use the string form for debug and research.
* You are able to extend standard commands and conditions for the purposes of
  your task.
* It has an interpreter in JavaScript, so you can create a distributed cluster
  from site visitors with a simple web page.

## Language Philosophy

* **Explicit code.** To control mutation, we must know, that when we change one
  byte, the algorithm will change slightly. When we copy a part of one algorithm
  to another, we expect, that the second algorithm will get some properties from
  the first one.
* **Everything makes sense.** A mutation doesn’t know about syntax and formats.
  Interpreter must try to get maximum sense, from any byte stream. For example,
  if a byte can code 2 values, we must read even bytes as first value and odd
  values as second. So any byte value makes sense, not just the first two.
* **Simple structures.** We can’t demand on the mutation placing all conditions
  in the beginning of a block. A better way is to mark conditions and expect
  them in any place of a block.

## Description

### Program

Each Evolu program starts with an `EVOLU:` prefix to check, that the file or
stream contains a program.

Like XML, Evolu Lang is just a syntax format. So you need to have
business-specific languages and mark, what language is used in this Evolu
program. So, after the `EVOLU:` prefix, stream must contain language name and a
colon.

    <program> ::= "EVOLU:" <language> ":" <rules>

Language name is case insensitive and may contain any chars, except colon and
space.

The genetic algorithm shouldn’t change these prefixes, they should be used only
to store and transfer Evolu programs.

### Rules

An Evolu program is split to separated blocks, *rules*, by *separator*.
The separator is a built-in command and may be coded in different bytes
(depending on command count, see “Commands and Parameters” section below).
But in any languages `0x00` byte is a separator.

    <rules>     ::= ( <rule> <separator> )*
    <separator> ::= 0x00 | <separator bytes in this language>

### Commands and Parameters

A rule contains pairs of *commands* and an optional *parameter*. Command byte
begins with `0` bit and command number is encoded by next 7 bits. Any other
bytes (beginning with `1`) after command encode parameter number. For example,
2 bytes `1aaaaaaa` and `1bbbbbbb` encode parameter with `aaaaaaabbbbbbb` value.

    <rule>      ::= ( <command> ( <parameter> )? )*
    <command>   ::=   0xxxxxxx
    <parameter> ::= ( 1xxxxxxx )*

There are 127 different commands number in one command byte, but language may
have less commands. A mutation can generate any bytes and Evolu Lang must try to
decode any of them. So, commands are marked numbers in a circle: if language
have 3 commands (`separator`, `a`, `b`), 0 will be encode `separator`, 1 – `a`,
2 – `b`, but 3 will encode `separator` again, 4 – `a`, etc.

In language description commands may specify format of it’s parameter.
Parameters can be unsigned integers (simple encoded by bits in parameter bytes)
or list of values (encode in cycle, like commands).

### Conditions

There is special command type – *condition*. If all conditions in a rule are
true, the rule’s commands will execute.

If a rule doesn’t have any conditions it will run once at start as constructor.

### Standard Commands Pack

You can create your own language with Evolu Lang, but for common tasks it has
the standard commands pack to create Turing completeness languages.

Conditions:

* `if_signal` will be true, when program receives input signal (its name will
  be taken from parameter). If the rule contains several these conditions with
  different signals, all `if_signal` conditions will be true by any of these
  signals (because, program may receive only one signal at a moment).
* `if_var_more_0` will be true if variable (its name will be taken from
  condition parameter) will be more, than zero.

Commands:

* `send_signal` will send output signal (its name will be taken from parameter).
* `var_up` will increase variable from parameter.
* `var_down` will decrease variable from parameter.

The developer must define, what input and output signals will be in the
language, but variables can be added dynamically by mutation.

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

Evolu Lang is licensed under the GNU Lesser General Public License version 3.
See the LICENSE file or http://www.gnu.org/licenses/lgpl.html.

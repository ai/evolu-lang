# Evolu

Evolu is a programming language to automatically generate programs by evolution
(genetic programming). It created to be readable for human (instead of
artificial neural networks) and easy editable and mixable for genetics algorithm
(instead of tree structure and modern production languages).

## How It Work

Developer define commands by Evolu to create business specific language (or uses
standard commands pack) and defines tests (*fitness*), to determine what program
he want to create.

In next step he use generator, which use genetics algorithm, particle swarm
optimization or another evolutionary algorithms. In the simplest case:
1. Generator create array (*population*) with random bytes (*genes*).
2. It add random changes (mutation) to each byte stream in this array.
3. It compile each of this random bytes streams by Evolu language and run
   obtained programs with tests.
4. Bad programs will be deleted and best programs will be copied to population.
5. Generator return to step 2 until obtained program will pass all test.

## Features

* It is similar to usual programming languages with variables, commands, blocks
  and conditions.
* Simple and explicit code. If you change one byte of code, you will change one
  command or parameter in program. If you just join two half-part of two
  different programs, you will get algorithm with properties of this two part.
* Program is coded to byte stream, so you can use a lot of libraries to mutate
  code. Of course, you can use string form for debug and research.
* You may to extend standard commands and conditions for the purposes of your
  task.
* It has interpreter on JavaScript, so you can create distributed cluster from
  site visitors by simple web page.

## Language Philosophy

* **Explicit code.** To control mutation, we must know, that when we change one
  byte, algorithm will change for little. When we copy part of one algorithm to
  another, we except, that second algorithm get some properties from first one.
* **Everything make sense.** Mutation doesn’t know about syntax and formats.
  Interpreter must try to get maximum sense, from any bytes stream. For example,
  byte can code 2 values, we must read even bytes as first value and odd values
  as second. So any byte value make sense, not just first two.
* **Simple structures.** We can’t demand from the mutation to place all
  conditions in start of block. Better way is to mark conditions and expect it
  in any place of block.

## Description

### Program

Each Evolu program start from `EVOLU:` prefix to check, that file or stream
contain program.

As XML, Evolu is a just syntax format. So you need to have business-specific
languages and mark, what language is used in this Evolu program. So after
`EVOLU:` stream must contain language name and colon.

    <program> ::= "EVOLU:" <language> ":" <rules>

Language name is case insensive and may contain any chars, except colon and
space.

Genetics algorithm shouldn’t change this prefixes, they should be used only to
store and transfer Evolu programs.

### Rules

Evolu program is split to separated blocks, *rules*, by *separator*. Separator
is a build-in command and may be coded in different bytes (depending on command
count, see “Commands and Parameters” section below). But in any languages `0x00`
byte is a separator.

    <rules>     ::= ( <rule> <separator> )*
    <separator> ::= 0x00 | <separator bytes in this language>

### Commands and Parameters

Rule contain pairs of *commands* and optional *parameter*. Command byte begins
with `0` bit and command number is encoded by next 7 bits. Any other bytes
(begins with `1`) after command encode parameter number. For example, 2 bytes
`1aaaaaaa` and `1bbbbbbb` encode parameter with `aaaaaaabbbbbbb` value.

    <rule>      ::= ( <command> ( <parameter> )* )*
    <command>   ::=   0xxxxxxx
    <parameter> ::= ( 1xxxxxxx )*

There are 127 different commands number in one command byte, but language may
has less commands. Mutation can generate any bytes and Evolu must try to decode
any of them. So, commands are marked numbers in a circle: if language have 3
commands (`separator`, `a`, `b`), 0 will be encode `separator`, 1 – `a`,
2 – `b`, but 3 will encode `separator` again, 4 – `a`, etc.

In language description commands may specify format of it’s parameter.
Parameters can be unsigned integers (simple encoded by bits in parameter bytes)
or list of values (encode in cycle, like commands).

### Conditions

There is special command type – *condition*. If all conditions in rule is true,
rule’s commands will be execute.

If rule doesn’t have any conditions it will be run once at start as constructor.

### Standard Commands Pack

You can create you own language with Evolu, but for common tasks Evolu has
standard commands pack to create Turing completeness languages.

Conditions:

* `if_signal` will be true, when program will receive input signal (it name will
  be taken from parameter). If rule contain several this conditions with
  different signals, all `if_signal` conditions will be true by any of this
  signals (because, program may receive only one signal at one moment).
* `if_var_more_0` will be true if variable (it name will be taken from condition
  parameter) will be more, that zero.

Commands:

* `send_signal` will send output signal (it name will be taken from parameter).
* `var_up` will increase variable from parameter.
* `var_down` will decrease variable from parameter.

Developer must define, what input and output signals will be in language, but
variables can be added dynamically by mutation.

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

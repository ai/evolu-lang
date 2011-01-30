/*
 * Copyright (C) 2010 Andrey “A.I.” Sitnik <andrey@sitnik.ru>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

;(function() {
    
    if ('undefined' == typeof(evolu)) evolu = { }
    
    evolu.lang = {
        
        version: '0.1',
        
        /** Hash of language names (in lower case) to language objects. */
        _languages: { },
        
        /**
         * Create/recreate Evolu language with `name`: create new
         * `evolu.lang.Language` instance and call `initializer` on it and put
         * to available languages list.
         * 
         * Use `evolu.lang.compile` to compile programs by your language or use
         * `evolu.lang.get` to get language object.
         * 
         *   evolu.lang.add('LNG', function() {
         *       this.condition('if_receive_signal')
         *       this.command('send_signal', function() { … })
         *   })
         */
        add: function(name, initializer) {
            var lower = name.toLowerCase()
            var lang = new this.Language(name)
            initializer.call(lang)
            this._languages[lower] = lang
            return lang
        },
        
        /**
         * Return Evolu language with `name`, which was be added by
         * `evolu.lang.add(name, initializer)`.
         * 
         * var lang = evolu.lang.get('LNG')
         */
        get: function(name) {
            var lower = name.toLowerCase()
            return this._languages[lower]
        },
        
        /**
         * Compile Evolu program to `evolu.lang.Code` object. `program` must be
         * a string, started by “EVOLU:lang:”, where “lang” is a language name.
         * 
         *   evolu.lang.add('LNG', function() { … })
         *   
         *   var code = evolu.lang.compile('EVOLU:LNG:123')
         */
        compile: function(program) {
            var blocks = program.split(':', 3)
            if ('EVOLU' != blocks[0])
                throw "It isn't Evolu program, because it hasn't EVOLU " +
                      "mark at beginning."
            
            var lang = this.get(blocks[1])
            if (!lang) throw 'Unknown Evolu language `' + blocks[1] + '`'
            
            var bytes = [], string = blocks[2]
            for (var i = 0; i < string.length; i++)
                bytes.push(string.charCodeAt(i))
            
            return lang.compile(bytes)
        }
        
    }
    
    /**
     * Sublanguage of Evolu Lang.
     * 
     * As XML, Evolu Lang is a just syntax format. You can set your own commands
     * and condition based on your task.
     * 
     * For common tasks Evolu Lang has Turing completeness standard commands
     * pack with variables (increase, decrease and check for zero) and
     * input/output signals. See `evolu.lang.standard` object.
     */
    evolu.lang.Language = function(name) {
        this.name = name
        this._list = [this._separator]
        this.commands = { separator: this._separator }
    }
    evolu.lang.Language.prototype = {
        
        /** Language name. */
        name: '',
        
        /** Hash name to language commands. */
        commands: { },
        
        /** Build-in separator command. */
        _separator: { name: 'separator', separator: true },
        
        /** Array of language commands to convert number to commands. */
        _list: [],
        
        /**
         * Execute `package` with this language instance in first argument.
         * It is short way to use several language changed (commands, code
         * properties) as library.
         * 
         *   send_signal = function(lang) {
         *       lang.command('send_signal', { … })
         *   }
         *   
         *   evolu.lang.add('LNG', function() { this.add(send_signal) })
         */
        add: function(package) {
            package(this)
            return this
        },
        
        /**
         * Add command `name` to language.
         * 
         * Command could has properties:
         * * install: function, which will be run after compile new program to
         *            add methods and variables to it.
         * * init:    function(param), which will be run, when parser will read
         *            next rule with this command.
         * * run:     function(param), which will be run, when this rule with
         *            this command will be execute.
         * * params:  array of supported command parameters.
         * 
         * In call functions `this` will be current `evolu.lang.Code` instance.
         * In `run` and `init` functions you can get current rule and current
         * rule line by `this.currentRule` and `this.currentLine` properties.
         * 
         * If you want to set only `run`, you can set function as `command`.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set `position` in command object to
         * specify specify command number.
         * 
         * Note, that first command is build-in rule separator.
         */
        command: function(name, command) {
            if ('function' == typeof(command))
                command = { run: command }
            
            if (undefined == command) command = { }
            command.name = name
            
            this.commands[name] = command
            if (undefined != command.position) {
                var pos = command.position
                delete command.position
                this._list.splice(pos, 0, command)
            } else {
                this._list.push(command)
            }
            
            return this
        },
        
        /**
         * Add condition-command `if_postfix` to language. Condition is regular
         * command, with `condition: true` in object and special `init` (which
         * add rule to index).
         * 
         * Expect of `command` this method will set function in second argument
         * as `nit` property.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set `position` in command object to
         * specify specify command number.
         */
        condition: function(name, condition) {
            if ('function' == typeof(condition))
                condition = { init: condition }
            if (undefined == condition) condition = { }
            condition.condition = true
            
            if (condition.init) {
                var current = condition.init
                var glob = this._initCondition
                condition.init = function() {
                    glob.apply(this, arguments)
                    current.apply(this, arguments)
                }
            } else {
                condition.init = this._initCondition
            }
            
            return this.command(name, condition)
        },
        
        /**
         * Compile array of `bytes` number of this language commands and
         * parameters to `evolu.lang.Code` object.
         * 
         * It is a bit faster, than `evolu.lang.compile`, so it’s useful in
         * genetic programming cycle (or in another case, when you already know
         * language and work with array of numbers).
         * 
         *   var bytes = mutate(bestCode.bytes)
         *   var newCode = lang.compile(bytes)
         */
        compile: function(bytes) {
            var code = new evolu.lang.Code(this)
            var count = this._list.length
            
            code.bytes = bytes
            bytes = bytes.concat([0, 0]) // Add separators to end last rule
            
            var param, command, lines = []
            for (var i = 0; i < bytes.length; i++) {
                var byte = bytes[i]
                if (128 <= byte) {
                    byte -= 128
                    param = (undefined == param ? byte : param * 128 + byte)
                } else {
                    if (undefined != command) {
                        command = this._list[command % count]
                        if (this._separator == command) {
                            code._add(lines)
                            lines = []
                        } else {
                            if (undefined != param) {
                                if (command.params) {
                                    param = command.params[
                                        param % command.params.length]
                                }
                                lines.push({ command: command, param: param })
                            } else {
                                lines.push({ command: command })
                            }
                        }
                    }
                    param = undefined
                    command = byte
                }
            }
            
            return code
        },
        
        /** Command `init` property for all conditions. */
        _initCondition: function(param) {
            this.currentRule.required += 1
            
            var index = this._index(this.currentLine.command.name, param)
            var condition = this._conditions[index]
            if (condition) {
                condition.push(this.currentRule)
            } else {
                this._conditions[index] = [this.currentRule]
            }
        }
        
    }
    
    /** Program on Evolu language. */
    evolu.lang.Code = function(language) {
        this.language = language
        this.rules = []
        this._initializers = []
        this._conditions = { }
        this._running = { }
        this._changes = { }
        this._listeners = { }
        
        var commands = this.language.commands
        for (name in commands)
            if (commands[name].install) commands[name].install.call(this)
    }
    evolu.lang.Code.prototype = {
        
        /** Code language object. */
        language: undefined,
        
        /** Original bytes of program. */
        bytes: undefined,
        
        /** Program rules. */
        rules: [],
        
        /** Rules without conditions to run as constructor. */
        _initializers: [],
        
        /** Condition to rule index. */
        _conditions: { },
        
        /** List of rules with all completed conditions. */
        _running: { },
        
        /**
         * Hash of rule ID to `['add', rule]` or `['del', rule]` to change
         * `_running` list on next `run` call.
         */
        _changes: { },
        
        /** Hash of event name to array of listeners. */
        _listeners: { },
        
        /**
         * Add new rule with list of command name or `[command, param]` in
         * arguments.
         * 
         *   code.rule('if_variable_is_zero', ['send_signal', 'empty'])
         */
        rule: function() {
            if (undefined == this.bytes) this.bytes = []
            
            var command, param, j, lines = []
            for (var i = 0; i < arguments.length; i++) {
                if ('string' == typeof arguments[i]) {
                    command = arguments[i]
                    param = undefined
                } else {
                    command = arguments[i][0]
                    param = arguments[i][1]
                }
                
                for (j = 0; j < this.language._list.length; j++) {
                    if (this.language._list[j].name == command) {
                        command = this.language._list[j]
                        break
                    }
                }
                this.bytes.push(j)
                
                if (undefined == param) {
                    lines.push({ command: command })
                } else {
                    lines.push({ command: command, param: param })
                    if (command.params) {
                        for (j = 0; j < command.params.length; j++) {
                            if (command.params[j] == param) {
                                param = j
                                break
                            }
                        }
                    }
                    this.bytes.push(128 + param)
                }
            }
            this.bytes.push(0)
            
            return this._add(lines)
        },
        
        /**
         * Register `callback` for `event`.
         * 
         *   code.listen('var_changed', function(name, value) {
         *       console.log('Change ' + name + ' to ' + value)
         *   })
         */
        listen: function(event, callback) {
            var list = this._listeners[event]
            if (!list) list = this._listeners[event] = []
            list.push(callback)
        },
        
        /**
         * Call with `params` all listeners for `event`.
         * 
         *   code.fire('var_changed', ['a', 1])
         */
        fire: function(event, params) {
            var list = this._listeners[event]
            if (list) {
                for (var i = 0; i < list.length; i++)
                    list[i].apply(this, params)
            }
        },
        
        /**
         * Initialize program. Run all rules without conditions. You should add
         * any listeners before use it and take any actions with code (send
         * signals, change conditions) only after call `init`.
         */
        init: function() {
            for (var i = 0; i < this._initializers.length; i++)
                this._initializers[i].run()
        },
        
        /**
         * Mark `condition` with this name and `param` as completed and insert
         * all necessary rules to running list.
         * 
         * For example, when variable “a” is set to zero:
         * 
         *   code.on('if_variable_is_zero', 'a')
         * 
         * All rules have own `on` method:
         * 
         *   code.rules[0].on()
         */
        on: function(condition, param) {
            var rules = this.conditions(condition, param)
            for (var i = 0; i < rules.length; i++) rules[i].on()
            return rules
        },
        
        /**
         * Mark `condition` with this name and `param` as uncompleted and
         * remove all unnecessary rules from running list.
         * 
         * For example, when variable “a” is set to non-zero value:
         * 
         *   code.off('if_variable_is_zero', 'a')
         * 
         * All rules have own `off` method:
         * 
         *   code.rules[0].off()
         */
        off: function(condition, param) {
            var rules = this.conditions(condition, param)
            for (var i = 0; i < rules.length; i++) rules[i].off()
            return rules
        },
        
        /**
         * Run all rules from running list (with only completed conditions).
         * This method take only one step: all rules, which will be enabled by
         * running rules, will be execute on next `run` call.
         * 
         * For example, when code receive signal “get_result”:
         * 
         *   code.on('if_receive_signal', 'get_result')
         *   code.run()
         *   code.off('if_receive_signal', 'get_result')
         */
        run: function() {
            for (id in this._changes) {
                if ('add' == this._changes[id][0]) {
                    this._running[id] = this._changes[id][1]
                } else {
                    delete this._running[id]
                }
            }
            this._changes = { }
            
            for (var id in this._running) this._running[id].run()
        },
        
        /** Return all rules with this `condition` name and `param`. */
        conditions: function(condition, param) {
            return this._conditions[this._index(condition, param)] || []
        },
        
        /**
         * Return original string representation of program bytes with
         * Evolu Lang and language marks at beginning.
         * 
         *   code = evolu.lang.compile('EVOLU:LNG:123')
         *   code.toSource() // => "EVOLU:LNG:123"
         */
        toSource: function() {
            return 'EVOLU:' + this.language.name + ':' +
                String.fromCharCode.apply(this, this.bytes)
        },
        
        /** Add new rule with array `lines` with `[command, param]`. */
        _add: function(lines) {
            var rule = new evolu.lang.Rule(this, lines)
            this.rules.push(rule)
            
            var command, initializer = true
            for (var i = 0; i < lines.length; i++) {
                command = lines[i].command
                if (command.condition) initializer = false
                if (command.init) {
                    this.currentRule = rule
                    this.currentLine = lines[i]
                    command.init.call(this, lines[i].param)
                }
            }
            if (initializer) {
                rule.initializer = true
                this._initializers.push(rule)
            }
            
            return rule
        },
        
        /**
         * Return index name for `condition` name and param to use in
         * `_conditions`.
         */
        _index: function(condition, param) {
            if (undefined == param) {
                return condition
            } else {
                return condition + ' ' + param
            }
        }
        
    }
    
    /** Separated part of code’s commands. */
    evolu.lang.Rule = function(code, lines) {
        this.code = code
        this.id = code.rules.length
        this.lines = lines
    }
    evolu.lang.Rule.prototype = {
        
        /** Rule owner instance of `evolu.lang.Code`. */
        code: undefined,
        
        /** Array of rule’s lines of commands and params. */
        lines: [],
        
        /** Rule ID, that is unique in code. */
        id: undefined,
    
        /** Count of uncompleted conditions. */
        required: 0,
        
        /**
         * Set all `currentRule` and `currentLine` property to code and run all
         * commands in rule.
         */
        run: function() {
            this.code.currentRule = this
            var line
            for (var i = 0; i < this.lines.length; i++) {
                line = this.code.currentLine = this.lines[i]
                if (line.command.run)
                    line.command.run.call(this.code, line.param)
            }
        },
        
        /**
         * Make `count` conditions as completed. If all rule’s conditions are
         * completed, rule will be execute on next `run` call.
         */
        on: function(count) {
            this.required -= (count || 1)
            if (0 == this.required) this.code._changes[this.id] = ['add', this]
            return this.required
        },
        
        /**
         * Make `count` conditions as uncompleted and remove rule from
         * executing.
         */
        off: function(count) {
            if (0 == this.required) this.code._changes[this.id] = ['del', this]
            this.required += (count || 1)
            return this.required
        }
        
    }
    
    /** Standard command pack for Evolu Lang. */
    evolu.lang.standard = { }
    
    /**
     * Add commands to increase/decrease variables and condition, that variable
     * is more than zero.
     * 
     *   evolu.lang.add('LNG', function() {
     *       lang.add(evolu.lang.standard.variables)
     *   })
     * 
     * On changing variable, event `var_changed` will be send with variable
     * name, new variable value and change value.
     * 
     *   code.listen('var_changed', function(name, value, diff) {
     *       console.log('Change ' + name +
     *                   ' from ' + (value + diff) + ' to ' + value)
     *   })
     */
    evolu.lang.standard.variables = function(lang) {
        lang.add(evolu.lang.standard.variables.moreZero)
        lang.add(evolu.lang.standard.variables.increase)
        lang.add(evolu.lang.standard.variables.decrease)
    }
    
    /** Create hash with variables. */
    evolu.lang.standard.variables._install = function() {
        this._variables = { }
    }
    
    /** Initialize variable to zero. */
    evolu.lang.standard.variables._init = function(variable) {
        if (undefined != variable)
            this._variables[variable] = 0
    }
    
    /** Condition, that variable is more, that zero. */
    evolu.lang.standard.variables.moreZero = function(lang) {
        lang.condition('if_var_more_0', {
            install: function() {
                this.listen('var_changed', function(variable, value, diff) {
                    if (0 == value && -1 == diff) {
                        this.off('if_var_more_0', variable)
                    } else if (1 == value && 1 == diff) {
                        this.on('if_var_more_0', variable)
                    }
                })
            }
        })
    }
    
    /** Command to increase variable, which number will be in line parameter. */
    evolu.lang.standard.variables.increase = function(lang) {
        lang.command('var_up', {
            install: evolu.lang.standard.variables._install,
            init: evolu.lang.standard.variables._init,
            run: function(variable) {
                if (undefined == variable) return
                
                var value = this._variables[variable] + 1
                this._variables[variable] = value
                
                this.fire('var_changed', [variable, value, +1])
            }
        })
    }
    
    /** Command to decrease variable, which number will be in line parameter. */
    evolu.lang.standard.variables.decrease = function(lang) {
        lang.command('var_down', {
            install: evolu.lang.standard.variables._install,
            init: evolu.lang.standard.variables._init,
            run: function(variable) {
                if (undefined == variable) return
                
                var value = this._variables[variable] - 1
                this._variables[variable] = value
                
                this.fire('var_changed', [variable, value, -1])
            }
        })
    }
    
    /**
     * Allow program to get information from outside: add conditions to
     * check input signals and method `signal(name)` to send input signal.
     * 
     * You must set supported signals for you task:
     *
     *   evolu.lang.add('LNG', function() {
     *       this.add(evolu.lang.standard.input('tick', 'result'))
     *   })
     *   code = evolu.lang.compile('EVOLU:LNG:…')
     *   code.init()
     *   code.signal('tick').signal('result')
     * 
     * Method `signal` execute `run` once. So, if you want to execute all
     * rules, which are enabled by commands in rule with signal condition,
     * you must call `run` again.
     * 
     * If rule contain conditions for “A” and “B” signals, both conditions
     * will be enabled on signal “A” OR “B” (because program can’t receive
     * several signal at one moment).
     */
    evolu.lang.standard.input = function() {
        var signals = arguments
        return function(lang) {
            lang.condition('if_signal', {
                params: signals,
                init: function() {
                    var rule = this.currentRule
                    if (undefined == rule.signal_conditions) {
                        rule.signal_conditions = 1
                    } else {
                        rule.signal_conditions += 1
                    }
                },
                install: function() {
                    this.signal = function(signal) {
                        var rules = this.conditions('if_signal', signal)
                        for (var i = 0; i < rules.length; i++)
                            rules[i].on(rules[i].signal_conditions)
                        this.run()
                        for (var i = 0; i < rules.length; i++)
                            rules[i].off(rules[i].signal_conditions)
                        return this
                    }
                }
            })
        }
    },
    
    /**
     * Allow program to send information to outside: add command to send
     * output signals and event `receive_signal` to catch it from you code.
     * 
     * You must set supported signals for you task:
     *
     *   evolu.lang.add('LNG', function() {
     *       this.add(evolu.lang.standard.output('odd', 'even'))
     *   })
     *   code = evolu.lang.compile('EVOLU:LNG:…')
     *   code.listen('send_signal', function(signal) {
     *       // Print “odd” or “even”.
     *       console.log('Count is ' + signal)
     *   })
     */
    evolu.lang.standard.output = function() {
        var signals = arguments
        return function(lang) {
            lang.command('send_signal', {
                params: signals,
                run: function(signal) {
                    if (undefined == signal) return
                    this.fire('receive_signal', [signal])
                }
            })
        }
    }
})();

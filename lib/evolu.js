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
    
    evolu = {
        
        version: '0.1',
        
        /** Hash of language names (in lower case) to language objects. */
        _languages: { },
        
        /**
         * Return Evolu language with _name_. If you set _initializer_, it will
         * create/recreate language: create new _evolu.Language_ instance and
         * call _initializer_ on it. For unknown language _name_ it will return
         * _undefined_.
         * 
         *   evolu.lang('LNG', function() {
         *       this.condition('if_receive_signal')
         *       this.command('send_signal', function() { … })
         *   })
         *   
         *   var lang = evolu.lang('LNG')
         */
        lang: function(name, initializer) {
            var lower = name.toLowerCase()
            if (initializer) {
                var lang = new this.Language(name)
                initializer.call(lang)
                this._languages[lower] = lang
                return lang
            } else {
                return this._languages[lower]
            }
        },
        
        /**
         * Compile Evolu program to _evolu.Code_ object. _program_ must be a
         * string, started by “EVOLU:lang:”, where “lang” is a language name.
         * 
         *   evolu.lang('LNG', function() { … })
         *   
         *   var code = evolu.compile('EVOLU:LNG:123')
         */
        compile: function(program) {
            var blocks = program.split(':', 3)
            if ('EVOLU' != blocks[0])
                throw "It isn't Evolu program, because it hasn't EVOLU " +
                      "mark at beginning."
            
            var lang = this.lang(blocks[1])
            if (!lang) throw 'Unknown Evolu language `' + blocks[1] + '`'
            
            var bytes = [], string = blocks[2]
            for (var i = 0; i < string.length; i++)
                bytes.push(string.charCodeAt(i))
            
            return lang.compile(bytes)
        }
        
    }
    
    /** Evolu language. */
    evolu.Language = function(name) {
        this.name = name
        this._list = [this._separator]
        this.commands = { separator: this._separator }
    }
    evolu.Language.prototype = {
        
        /** Language name. */
        name: '',
        
        /** Hash name to language commands. */
        commands: { },
        
        /** Build-in separator command. */
        _separator: { name: 'separator', separator: true },
        
        /** Array of language commands to convert number to commands. */
        _list: [],
        
        /**
         * Execute _package_ with this language instance in first argument.
         * It is short way to use several language changed (commands, code
         * properties) as library.
         * 
         *   send_signal = function(lang) {
         *       lang.command('send_signal', { … })
         *   }
         *   
         *   evolu.lang('LNG', function() { this.add(send_signal) })
         */
        add: function(package) {
            package(this)
            return this
        },
        
        /**
         * Add command _name_ to language.
         * 
         * Command could has properties:
         * * _run_: function(param), which will be run, when this rule with this
         *   command will be execute.
         * * _init_: function(param), which will be run, when parser will read
         *   next rule with this command.
         * * _params_: array of supported command parameters.
         * * _install_: function, which will be run, when new _evolu.Code_
         *   instance will be create by this language.
         * 
         * In call functions _this_ will be current _evolu.Code_ instance.
         * In _run_ and _init_ functions you can get current rule and current
         * rule line by _this.currentRule_ and _this.currentLine_ properties.
         * 
         * If you want to set only _run_, you can set function as _command_.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set _position_ in command object to
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
         * Add condition-command _if_postfix_ to language. Condition is regular
         * command, with _condition: true_ in object and special _init_ (which
         * add rule to index).
         * 
         * Expect of _command_ this method will set function in second argument
         * as _init_ property.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set _position_ in command object to
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
         * Compile array of _bytes_ number of this language commands and
         * parameters to _evolu.Code_ object.
         * 
         * It is a bit faster, than _evolu.compile_, so it’s useful in
         * genetics programming cycle (or in another case, when you already know
         * language and work with array of numbers).
         * 
         *   var bytes = mutate(bestCode.bytes)
         *   var newCode = lang.compile(bytes)
         */
        compile: function(bytes) {
            var code = new evolu.Code(this)
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
        
        /** Command _init_ property for all conditions. */
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
    evolu.Code = function(language) {
        this.language = language
        this._rules = []
        this._initializers = []
        this._conditions = { }
        this._running = { }
        this._toRun = []
        this._toStop = []
        this._listeners = { }
        
        var commands = this.language.commands
        for (name in commands)
            if (commands[name].install) commands[name].install.call(this)
    }
    evolu.Code.prototype = {
        
        /** Code language object. */
        language: undefined,
        
        /** Original bytes of program. */
        bytes: undefined,
        
        /** Program rules. */
        _rules: [],
        
        /** Rules without conditions to run as constructor. */
        _initializers: [],
        
        /** Condition to rule index. */
        _conditions: { },
        
        /** List of rules with all completed conditions. */
        _running: { },
        
        /**
         * List of rules, which should be added to running list on next _run_
         * call.
         */
        _toRun: [],
        
        /**
         * List of rule IDs, which should be removed from running list on next
         * _run_ call.
         */
        _toStop: [],
        
        /** Hash of event name to array of listeners. */
        _listeners: { },
        
        /**
         * Add new rule with list of command name or [command, param] in
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
         * Register _callback_ for _event_.
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
         * Call with _params_ all listeners for _event_.
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
         * signals, change conditions) only after call _init_.
         */
        init: function() {
            for (var i = 0; i < this._initializers.length; i++)
                this._runRule(this._initializers[i])
        },
        
        /**
         * Mark _condition_ with this name and _param_ as completed and insert
         * all necessary rules to running list.
         * 
         * For example, when variable “a” is set to zero:
         * 
         *   code.on('if_variable_is_zero', 'a')
         */
        on: function(condition, param) {
            var rules = this._require(condition, param, -1)
            for (var i = 0; i < rules.length; i++)
                if (0 == rules[i].required) this._toRun.push(rules[i])
            return rules
        },
        
        /**
         * Mark _condition_ with this name and _param_ as uncompleted and
         * remove all unnecessary rules from running list.
         * 
         * For example, when variable “a” is set to non-zero value:
         * 
         *   code.off('if_variable_is_zero', 'a')
         */
        off: function(condition, param) {
            var rules = this._require(condition, param, +1)
            for (var i = 0; i < rules.length; i++)
                if (1 == rules[i].required) this._toStop.push(rules[i].id)
            return rules
        },
        
        /**
         * Run all rules from running list (with only completed conditions).
         * This method take only one step: all rules, which will be enabled by
         * running rules, will be execute on next _run_ call.
         * 
         * For example, when code receive signal “get_result”:
         * 
         *   code.on('if_receive_signal', 'get_result')
         *   code.run()
         *   code.off('if_receive_signal', 'get_result')
         */
        run: function() {
            for (var i = 0; i < this._toRun.length; i++)
                this._running[this._toRun[i].id] = this._toRun[i]
            this._toRun = []
            
            for (var i = 0; i < this._toStop.length; i++)
                delete this._running[this._toStop[i]]
            this._toStop = []
            
            for (var id in this._running) this._runRule(this._running[id])
        },
        
        /**
         * Return original string representation of program bytes with Evolu and
         * language marks at beginning.
         * 
         *   code = evolu.compile('EVOLU:LNG:123')
         *   code.toSource() // => "EVOLU:LNG:123"
         */
        toSource: function() {
            return 'EVOLU:' + this.language.name + ':' +
                String.fromCharCode.apply(this, this.bytes)
        },
        
        /** Add new rule with array _lines_ with [command, param]. */
        _add: function(lines) {
            var rule = {
                lines: lines,
                required: 0,
                id: this._rules.length
            }
            this._rules.push(rule)
            
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
        
        /** Set all properties and run all commands in _rule_. */
        _runRule: function(rule) {
            this.currentRule = rule
            var line
            for (var i = 0; i < rule.lines.length; i++) {
                line = this.currentLine = rule.lines[i]
                if (line.command.run)
                    line.command.run.call(this, line.param)
            }
        },
        
        /**
         * Change cache of completed condition by _diff_ for rules with
         * _condition_ name and _param_.
         */
        _require: function(condition, param, diff) {
            var rules = this._conditions[this._index(condition, param)]
            if (rules) {
                for (var i = 0; i < rules.length; i++) {
                    rules[i].required += diff
                }
            }
            return rules || []
        },
        
        /**
         * Return index name for _condition_ name and param to use in
         * _this._conditions_.
         */
        _index: function(condition, param) {
            if (undefined == param) {
                return condition
            } else {
                return condition + ' ' + param
            }
        }
        
    }
    
    /** Evolu standard command pack. */
    evolu.standard = { }
    
    /**
     * Add commands to increase/decrease variables and condition, that variable
     * is more than zero.
     * 
     *   lang.add(evolu.standard.variables)
     * 
     * On changing variable, event _var_changed_ will be send with variable
     * name, new variable value and change value.
     * 
     *   code.listen('var_changed', function(name, value, diff) {
     *       console.log('Change ' + name +
     *                   ' from ' + (value + diff) + ' to ' + value)
     *   })
     */
    evolu.standard.variables = function(lang) {
        lang.add(evolu.standard.variables.moreZero)
        lang.add(evolu.standard.variables.increase)
        lang.add(evolu.standard.variables.decrease)
    }
    
    /** Create hash with variables. */
    evolu.standard.variables._install = function() {
        this._variables = { }
    }
    
    /** Initialize variable to zero. */
    evolu.standard.variables._init = function(variable) {
        if (undefined != variable)
            this._variables[variable] = 0
    }
    
    /** Condition, that variable is more, that zero. */
    evolu.standard.variables.moreZero = function(lang) {
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
    evolu.standard.variables.increase = function(lang) {
        lang.command('var_up', {
            install: evolu.standard.variables._install,
            init: evolu.standard.variables._init,
            run: function(variable) {
                if (undefined == variable) return
                
                var value = this._variables[variable] + 1
                this._variables[variable] = value
                
                this.fire('var_changed', [variable, value, +1])
            }
        })
    }
    
    /** Command to decrease variable, which number will be in line parameter. */
    evolu.standard.variables.decrease = function(lang) {
        lang.command('var_down', {
            install: evolu.standard.variables._install,
            init: evolu.standard.variables._init,
            run: function(variable) {
                if (undefined == variable) return
                
                var value = this._variables[variable] - 1
                this._variables[variable] = value
                
                this.fire('var_changed', [variable, value, -1])
            }
        })
    }
    
})();

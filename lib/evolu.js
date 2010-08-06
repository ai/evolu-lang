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
        this._commands = ['separator']
    }
    evolu.Language.prototype = {
        
        /** Language name. */
        name: '',
        
        /** Commands in language. */
        _commands: ['separator'],
        
        /**
         * Add command _name_ to language.
         * 
         * Command could has properties:
         * * _run_: function(param), which will be run, when this rule with this
         *   command will be execute.
         * * _init_: function(rule, command, param), which will be run, when
         *   parser will read rule with this command.
         * * _params_: array of supported command parameters.
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
            if (undefined != command.position) {
                var pos = command.position
                delete command.position
                this._commands.splice(pos, 0, command)
            } else {
                this._commands.push(command)
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
         * Compile _bytes_ of this language commands and parameters to
         * _evolu.Code_ object.
         */
        compile: function(bytes) {
            var code = new evolu.Code(this)
            var count = this._commands.length
            var param, command, rule = []
            
            code.bytes = bytes
            bytes = bytes.concat([0, 0]) // Add separators to end last rule
            
            for (var i = 0; i < bytes.length; i++) {
                var byte = bytes[i]
                if (128 <= byte) {
                    byte -= 128
                    param = (undefined == param ? byte : param * 128 + byte)
                } else {
                    if (undefined != command) {
                        command = this._commands[command % count]
                        if ('separator' == command) {
                            code._add(rule)
                            rule = []
                        } else {
                            if (undefined != param) {
                                if (command.params) {
                                    param = command.params[
                                        param % command.params.length]
                                }
                                rule.push([command, param])
                            } else {
                                rule.push([command])
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
        _initCondition: function(rule, command, param) {
            rule.required += 1
            
            var index = this._index(command.name, param)
            var condition = this._conditions[index]
            if (condition) {
                condition.push(rule)
            } else {
                this._conditions[index] = [rule]
            }
        }
        
    }
    
    /** Program on Evolu language. */
    evolu.Code = function(language) {
        this.language = language
        this._rules = []
        this._conditions = { }
        this._running = { }
    }
    evolu.Code.prototype = {
        
        /** Code language object. */
        language: undefined,
        
        /** Original bytes of program. */
        bytes: undefined,
        
        /** Program rules. */
        _rules: [],
        
        /** Condition to rule index. */
        _conditions: { },
        
        /** List of rules with all completed conditions. */
        _running: { },
        
        /** Add new rule with array _commands_ with [command, param]. */
        _add: function(commands) {
            var rule = {
                commands: commands,
                required: 0,
                id: this._rules.length
            }
            this._rules.push(rule)
            
            var command
            for (var i = 0; i < commands.length; i++) {
                command = commands[i][0]
                if (command.init)
                    command.init.call(this, rule, command, commands[i][1])
            }
            
            return rule
        },
        
        /**
         * Mark _condition_ with this name and _param_ as completed and insert
         * all necessary rules to running list.
         */
        up: function(condition, param) {
            var rules = this._require(condition, param, -1)
            for (var i = 0; i < rules.length; i++) {
                if (0 == rules[i].required)
                    this._running[rules[i].id] = rules[i]
            }
            return rules
        },
        
        /**
         * Mark _condition_ with this name and _param_ as uncompleted and
         * remove all unnecessary rules from running list.
         */
        down: function(condition, param) {
            var rules = this._require(condition, param, +1)
            for (var i = 0; i < rules.length; i++) {
                if (1 == rules[i].required)
                    delete this._running[rules[i].id]
            }
            return rules
        },
        
        /**
         * Return original string representation of program bytes with Evolu and
         * language marks at beginning.
         */
        toSource: function() {
            return 'EVOLU:' + this.language.name + ':' +
                String.fromCharCode.apply(this, this.bytes)
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
         * _this._conditions_
         */
        _index: function(condition, param) {
            if (undefined == param) {
                return condition
            } else {
                return condition + ' ' + param
            }
        }
        
    }
    
})();

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
        
        /** Hash of language names (in lower case) to language objects. */
        _languages: {},
        
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
        }
        
    }
    
    /** Evolu language. */
    evolu.Language = function(name) {
        this.name = name
        this._commands = []
    }
    evolu.Language.prototype = {
        
        /** Language name. */
        name: '',
        
        /** Commands in language. */
        _commands: [],
        
        /** Command _init_ property for all conditions. */
        _initCondition: function() { },
        
        /**
         * Add command _name_ to language.
         * 
         * Command could has properties:
         * * _run_: function(rule, params…), which will be run, when this rule
         *   with this command will be execute.
         * * _init_: function(rule, params…), which will be run, when parser
         *   will read rule with this command.
         * If you want to set only _run_, you can set function as _command_.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set _position_ in command object to
         * specify specify command number.
         */
        command: function(name, command) {
            if ('function' == typeof(command))
                command = { run: command }
            
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
         * command, with “if_” prefix in name, _condition: true_ in object and
         * special _init_ (which add rule to cache).
         * 
         * Expect of _command_ this method will set function in second argument
         * as _init_ property.
         * 
         * WARNING: command and condition order is important, different order is
         * different language. You may set _position_ in command object to
         * specify specify command number.
         */
        condition: function(postfix, condition) {
            if ('function' == typeof(condition))
                condition = { init: condition }
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
            
            return this.command('if_' + postfix, condition)
        }
        
    }
    
})();

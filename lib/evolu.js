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
         * Load or create new Evolu language. If language with _name_ was
         * already created, function will return it, else it create new
         * _evolu.Language_ instance and call _initializer_ on it.
         */
        lang: function(name, initializer) {
            var lower = name.toLowerCase()
            var lang = this._languages[lower]
            if (!lang) {
                lang = new evolu.Language(name)
                if (initializer) initializer.call(lang)
                this._languages[lower] = lang
            }
            return lang
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
        
        /**
         * Add command _name_ to language.
         * 
         * WARNING: command order is important, different order is different
         * language. You may set _position_ in command object to specify specify
         * command number.
         */
        command: function(name, command) {
            command.name = name
            if (command.position) {
                var pos = command.position
                delete command.position
                this._commands.splice(pos, 0, command)
            } else {
                this._commands.push(command)
            }
            return this
        }
        
    }
    
})();

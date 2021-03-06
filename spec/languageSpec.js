describe('evolu.lang.Language', function() {
    it('should create new language', function() {
        evolu.lang._languages = {}
        expect(evolu.lang.get('LNG')).not.toBeDefined()
    
        var lang = evolu.lang.add('LNG', function() { this.a = 1 })

        expect(evolu.lang.get('LNG')).toBe(lang)
        expect(lang instanceof evolu.lang.Language).toBeTruthy()
        expect(lang.name).toEqual('LNG')
        expect(lang.a).toEqual(1)
    })
    
    it('should ignore case in language name', function() {
        evolu.lang.add('LNG', function() { this.a = 1 })
        expect(evolu.lang.get('lng')).toBe(evolu.lang.get('LNG'))
    })
    
    it('should recreate language', function() {
        evolu.lang.add('LNG', function() { this.a = 1 })
        evolu.lang.add('lng', function() { this.b = 2 })
        
        expect(evolu.lang.get('LNG').a).not.toBeDefined()
        expect(evolu.lang.get('LNG').b).toEqual(2)
    })
    
    it('should add commands', function() {
        var func = function() { }
        var lang = evolu.lang.add('LNG', function() {
            this.command('a', func).
                 command('c', { c: 3 }).
                 command('b', { b: 2, position: 2 })
        })
        
        expect(lang.commands).toEqual({
            separator: lang._separator,
            a:         { name: 'a', run: func },
            b:         { name: 'b', b: 2 },
            c:         { name: 'c', c: 3 }
        })
        expect(lang._list).toEqual([lang._separator,
                                    { name: 'a', run: func },
                                    { name: 'b', b: 2 },
                                    { name: 'c', c: 3 }])
    
        var another = evolu.lang.add('ANZ', function() { })
        expect(another.commands).toEqual({ separator: another._separator })
        expect(another._list).toEqual([ another._separator ])
    })
    
    it('should add condition', function() {
        var func = function() { }
        var lang = evolu.lang.add('LNG', function() {
            this.condition('if_b', { b: 2 }).
                 condition('if_a', { a: 1, position: 1 })
        })
        
        expect(lang._list).toEqual([
            lang._separator,
            { name: 'if_a', a: 1, condition: true, init: lang._initCondition },
            { name: 'if_b', b: 2, condition: true, init: lang._initCondition }
        ])
    })
    
    it('should find language for compile', function() {
        evolu.lang._languages = {}
        
        expect(function() {
            evolu.lang.compile('NO PROGRAM')
        }).toThrow("It isn't Evolu program, because it hasn't EVOLU mark " +
                   "at beginning.")
        
        expect(function() {
            evolu.lang.compile('EVOLU:LNG:abc')
        }).toThrow('Unknown Evolu language `LNG`')
        
        var lang = evolu.lang.add('LNG', function() { })
        
        spyOn(lang, 'compile')
        evolu.lang.compile('EVOLU:LNG:abc')
        expect(lang.compile).toHaveBeenCalledWith([97, 98, 99])
    })
    
    it('should compile bytes to rules', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.command('a', { params: ['one', 'two'] }).
                 command('b', { init: function() {} })
        })
        
        var code = lang.compile([128, 5, 0, 1, 128, 131, 2, 130, 128])
        
        expect(code instanceof evolu.lang.Code).toBeTruthy()
        expect(code.language).toEqual(lang)
        
        expect(code.rules).toEqual([
            {
                id: 0,
                lines: [{ command: lang.commands.b }],
                code: code,
                required: 0,
                initializer: true,
                on: evolu.lang.Rule.prototype.on,
                off: evolu.lang.Rule.prototype.off,
                run: evolu.lang.Rule.prototype.run
            },
            {
                id: 1,
                lines: [{ command: lang.commands.a, param: 'two' },
                        { command: lang.commands.b, param:  256  }],
                code: code,
                on: code._ruleOn,
                off: code._ruleOff,
                required: 0,
                initializer: true,
                on: evolu.lang.Rule.prototype.on,
                off: evolu.lang.Rule.prototype.off,
                run: evolu.lang.Rule.prototype.run
            }
        ])
    })
    
    it('install commands to code', function() {
        var result = ''
        var lang = evolu.lang.add('LNG', function() {
            this.command('a', {
                install: function() {
                    this.a = 1
                    result += '1'
                }
            })
        })
        var code = new evolu.lang.Code(lang)
        code.rule('a', 'a')
        
        expect(result).toEqual('1')
        expect(code.a).toEqual(1)
    })
    
    it('should call initializers on compiling', function() {
        var currentCode, currentRule, currentLine, bCalls = 0
        var lang = evolu.lang.add('LNG', function() {
            this.command('a', {
                    init: function() { }, params: ['one', 'two']
                 }).
                 command('b', {
                    init: function() {
                        bCalls += 1
                        currentCode = this
                        currentRule = this.currentRule
                        currentLine = this.currentLine
                    }
                 })
        })
        
        spyOn(lang.commands.a, 'init')
        
        var code = lang.compile([1, 128, 2])
        
        expect(lang.commands.a.init).toHaveBeenCalledWith('one')
        expect(bCalls).toEqual(1)
        expect(currentCode).toBe(code)
        expect(currentRule).toBe(code.rules[0])
        expect(currentLine).toBe(code.rules[0].lines[1])
    })
    
    it('should add package changes', function() {
        var result
        var lang = evolu.lang.add('LNG', function() {
            result = this.add(function(lng) { lng.one = 1 })
        })
        expect(lang.one).toEqual(1)
        expect(result).toEqual(lang)
    })
})

JSpec.describe('evolu.Language', function() {
    it('should create new language', function() {
        evolu._languages = {}
        expect(evolu.lang('LNG')).to(be_undefined)
    
        var lang = evolu.lang('LNG', function() { this.a = 1 })

        expect(evolu.lang('LNG')).to(be, lang)
        expect(lang).to(be_an_instance_of, evolu.Language)
        expect(lang.name).to(be, 'LNG')
        expect(lang.a).to(be, 1)
    })
    
    it('should ignore case in language name', function() {
        evolu.lang('LNG', function() { this.a = 1 })
        expect(evolu.lang('lng')).to(be, evolu.lang('LNG'))
    })
    
    it('should recreate language', function() {
        evolu.lang('LNG', function() { this.a = 1 })
        evolu.lang('lng', function() { this.b = 2 })
        
        expect(evolu.lang('LNG')).not_to(have_property, 'a')
        expect(evolu.lang('LNG')).to(have_property, 'b', 2)
    })
    
    it('should add commands', function() {
        var func = function() { }
        var lang = evolu.lang('LNG', function() {
            this.command('a', func).
                 command('c', { c: 3 }).
                 command('b', { b: 2, position: 2 })
        })
        
        expect(lang.commands).to(eql, {
            separator: lang._separator,
            a:         { name: 'a', line: lang._line, run: func },
            b:         { name: 'b', line: lang._line, b: 2 },
            c:         { name: 'c', line: lang._line, c: 3 }
        })
        expect(lang._list).to(eql, [lang._separator,
                                    { name: 'a', line: lang._line, run: func },
                                    { name: 'b', line: lang._line, b: 2 },
                                    { name: 'c', line: lang._line, c: 3 }])
    
        var another = evolu.lang('ANZ', function() { })
        expect(another.commands).to(eql, { separator: another._separator })
        expect(another._list).to(eql, [ another._separator ])
    })
    
    it('should add condition', function() {
        var func = function() { }
        var lang = evolu.lang('LNG', function() {
            this.condition('if_b', { b: 2 }).
                 condition('if_a', { a: 1, position: 1 })
        })
        
        expect(lang._list).to(eql, [
            lang._separator,
            {
                name: 'if_a', a: 1,
                condition: true, line: lang._line, init: lang._initCondition
            },
            {
                name: 'if_b', b: 2,
                condition: true, line: lang._line, init: lang._initCondition
            }
        ])
    })
    
    it('should find language for compile', function() {
        evolu._languages = {}
        
        expect(function() {
            evolu.compile('NO PROGRAM')
        }).to(throw_error, /isn't Evolu program/)
        
        expect(function() {
            evolu.compile('EVOLU:LNG:abc')
        }).to(throw_error, 'Unknown Evolu language `LNG`')
        
        var lang = evolu.lang('LNG', function() { })
        stub(lang, 'compile')
        expect(lang).to(receive, 'compile').with_args([97, 98, 99])
        var result = evolu.compile('EVOLU:LNG:abc')
    })
    
    it('should compile bytes to rules', function() {
        var lang = evolu.lang('LNG', function() {
            this.command('a', { params: ['one', 'two'] }).
                 command('b', { init: function() {} })
        })
        
        var code = lang.compile([128, 5, 0, 1, 128, 131, 2, 130, 128])
        
        expect(code).to(be_an_instance_of, evolu.Code)
        expect(code).to(have_property, 'language', lang)
        
        expect(code._rules).to(eql, [
            {
                id: 0,
                lines: [lang.commands.b.line()],
                required: 0,
                initializer: true
            },
            {
                id: 1,
                lines: [lang.commands.a.line('two'), lang.commands.b.line(256)],
                required: 0,
                initializer: true
            }
        ])
    })
    
    it('should create rule line for command', function() {
        var lang = evolu.lang('LNG', function() {
            this.command('a')
        })
        expect(lang.commands.a.line()).
            to(eql, { command: lang.commands.a })
        expect(lang.commands.a.line('one')).
            to(eql, { command: lang.commands.a, param: 'one' })
    })
    
    it('install commands to code', function() {
        var result = ''
        var lang = evolu.lang('LNG', function() {
            this.command('a', {
                install: function() {
                    this.a = 1
                    result += '1'
                }
            })
        })
        var code = new evolu.Code(lang)
        code.rule(lang.commands.a.line(), lang.commands.a.line())
        
        expect(result).to(be, '1')
        expect(code).to(have_property, 'a', 1)
    })
    
    it('should call initializers on compiling', function() {
        var currentCode, currentRule, currentLine, bCalls = 0
        var lang = evolu.lang('LNG', function() {
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
        
        expect(lang.commands.a).to(receive, 'init').with_args('one')
        
        var code = lang.compile([1, 128, 2])
        
        expect(bCalls).to(be, 1)
        expect(currentCode).to(be, code)
        expect(currentRule).to(be, code._rules[0])
        expect(currentLine).to(be, code._rules[0].lines[1])
    })
    
    it('should add package changes', function() {
        var result
        var lang = evolu.lang('LNG', function() {
            result = this.add(function(lng) { lng.one = 1 })
        })
        expect(lang).to(have_property, 'one', 1)
        expect(result).to(be, lang)
    })
})

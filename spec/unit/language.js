JSpec.describe('darwin.Language', function() {
    before_each(function() {
        evolu._languages = {}
    })
    
    it('should create new language', function() {
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
            this.command('one',   func).
                 command('three', { c: 3 }).
                 command('two',   { b: 2, position: 2 })
        })
        
        expect(lang._commands).to(eql, ['separator',
                                        { name: 'one',   run: func },
                                        { name: 'two',   b: 2 },
                                        { name: 'three', c: 3 }])
    })
    
    it('should add condition', function() {
        var func = function() { }
        var lang = evolu.lang('LNG', function() {
            this.condition('if_b', { b: 2 }).
                 condition('if_a', { a: 1, position: 1 })
        })
        
        expect(lang._commands).to(eql, [
            'separator',
            { name: 'if_a', a: 1, init: lang._initCondition, condition: true },
            { name: 'if_b', b: 2, init: lang._initCondition, condition: true }
        ])
    })
    
    it('should find language for compile', function() {
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
        var a = lang._commands[1], b = lang._commands[2]
        
        var code = lang.compile([128, 5, 0, 1, 128, 131, 2, 130, 128])
        
        expect(code).to(be_an_instance_of, evolu.Code)
        expect(code).to(have_property, 'language', lang)
        
        expect(code._rules).to(eql, [
            {
                id: 0,
                lines: [{ command: b }],
                required: 0
            },
            {
                id: 1,
                lines: [{ command: a, param: 'two' },
                        { command: b, param: 256   }],
                required: 0
            }
        ])
    })
    
    it('should call initializers on compiling', function() {
        var currentCode, currentRule, currentLine, bCalls = 0
        var lang = evolu.lang('LNG', function() {
            this.command('a', { init: function() { }, params: ['one', 'two'] }).
                 command('b', {
                    init: function() {
                        bCalls += 1
                        currentCode = this
                        currentRule = this.currentRule
                        currentLine = this.currentLine
                    }
                 })
        })
        var a = lang._commands[1], b = lang._commands[2]
        
        expect(a).to(receive, 'init').with_args('one')
        
        var code = lang.compile([1, 128, 2])
        
        expect(bCalls).to(be, 1)
        expect(currentCode).to(be, code)
        expect(currentRule).to(be, code._rules[0])
        expect(currentLine).to(be, code._rules[0].lines[1])
    })
    
    it('should init command', function() {
        var lang = evolu.lang('LNG', function() {
            this.command('a', { init: function(param) {
                expect(this).to(be_an_instance_of, evolu.Code)
                expect(this.currentRule.lines.length).to(be, 2)
                expect(this.currentLine.command.name).to(be, 'a')
                expect(param).to(be, 'one')
            } })
        })
        var a = lang._commands[1]
        var code = new evolu.Code(lang)
        code._add([
            { command: a,  param: 'one' },
            { command: a,  param: 'one' }
        ])
    })
    
    it('should init condition', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('a', function() { this.inited = 1 })
        })
        var code = new evolu.Code(lang)
        var a = lang._commands[1]
        
        var one = code._add([{ command: a,  param: 1 }, { command: a }])
        var two = code._add([{ command: a,  param: 1 }])
        
        expect(one.required).to(be, 2)
        expect(two.required).to(be, 1)
        expect(code._conditions).to(eql, { 'a 1': [one, two], 'a': [one] })
        
        expect(code).to(have_property, 'inited', 1)
    })
})

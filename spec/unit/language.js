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
                required: 0,
                initializer: true
            },
            {
                id: 1,
                lines: [{ command: a, param: 'two' },
                        { command: b, param: 256   }],
                required: 0,
                initializer: true
            }
        ])
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
        var a = lang._commands[1]
        var code = new evolu.Code(lang)
        code._add([ { command: a }, { command: a } ])
        
        expect(result).to(be, '1')
        expect(code).to(have_property, 'a', 1)
    })
    
    it('should add package changes', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(function(lng) { lng.one = 1 })
        })
        expect(lang).to(have_property, 'one', 1)
    })
})

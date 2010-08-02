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
                 command('two',   { b: 2, position: 1 })
        })
        
        expect(lang._commands).to(eql, [{ name: 'one',   run: func },
                                        { name: 'two',   b: 2 },
                                        { name: 'three', c: 3 }])
    })
    
    it('should add condition', function() {
        var func = function() { }
        var lang = evolu.lang('LNG', function() {
            this.condition('b', { b: 2 }).
                 condition('a', { a: 1, position: 0 })
        })
        
        expect(lang._commands).to(eql, [
            { name: 'if_a', a: 1, init: lang._initCondition, condition: true },
            { name: 'if_b', b: 2, init: lang._initCondition, condition: true }
        ])
    })
    
    it('should set own init for condition', function() {
        var lang = evolu.lang('LNG', function() {
            this._initCondition = function(i) { this.push(i + '_global') }
            this.condition('one', function(i) { this.push(i) })
        })
        
        var out = []
        lang._commands[0].init.call(out, 'a')
        expect(out).to(eql, ['a_global', 'a'])
    })
    
    it('should find language for compile', function() {
        expect(function() {
            evolu.compile('NO PROGRAM')
        }).to(throw_error, /isn't Evolu program/)
        
        expect(function() {
            evolu.compile('EVOLU:LNG:abc')
        }).to(throw_error, 'Unknown Evolu language `LNG`')
        
        var lang = evolu.lang('LNG', function() { })
        expect(lang).to(receive, 'compile', 'once').with_args([97, 98, 99])
        var result = evolu.compile('EVOLU:LNG:abc')
        
        expect(result).to(be_an_instance_of, evolu.Code)
        expect(result).to(have_property, 'language', lang)
    })
})

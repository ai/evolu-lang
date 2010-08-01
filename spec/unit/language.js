JSpec.describe('darwin.lang', function() {
    before_each(function() {
        evolu._languages = {}
    })
    
    it('should create new language', function() {
        var created  = evolu.lang('LNG', function() { this.a = 1 })
        var loaded   = evolu.lang('LNG')
        var another  = evolu.lang('ANZR')
        
        expect(loaded).to(be, created)
        expect(loaded).not_to(be, another)
        
        expect(loaded).to(be_an_instance_of, evolu.Language)
        expect(loaded.name).to(be, 'LNG')
        expect(loaded.a).to(be, 1)
        
        expect(another).to(be_an_instance_of, evolu.Language)
        expect(another.name).to(be, 'ANZR')
    })
    
    it('should call initializer only on new language', function() {
        evolu.lang('LNG', function() { this.a = 1 })
        evolu.lang('LNG', function() { this.b = 2 })
        
        var lang = evolu.lang('LNG')
        expect(lang.a).to(be, 1)
        expect(lang.b).to(be_undefined)
    })
    
    it('should ignore case in language name', function() {
        var upper = evolu.lang('LNG', function() { this.a = 1 })
        var lower = evolu.lang('lng', function() { this.b = 2 })
        
        expect(upper).to(be, lower)
        expect(upper.a).to(be, 1)
        expect(lower.b).to(be_undefined)
    })
    
    it('should add commands', function() {
        var lang = evolu.lang('LNG')
        
        var returned = lang.command('one', { a: 1 })
        expect(returned).to(be, lang)
        expect(lang._commands).to(eql, [{ name: 'one', a: 1 }])
        
        lang.command('three', { c: 3 })
        lang.command('two',   { b: 2, position: 1 })
        expect(lang._commands).to(eql, [{ name: 'one',   a: 1 },
                                        { name: 'two',   b: 2 },
                                        { name: 'three', c: 3 }])
    })
})

JSpec.describe('evolu.Code', function() {
    it('should return original program bytes', function() {
        evolu.lang('LNG', function() { })
        var code = evolu.compile('EVOLU:LNG:abc')
        expect(code.bytes).to(eql, [97, 98, 99])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:abc')
        
        code.bytes = [98, 99, 100]
        expect(code.toSource()).to(eql, 'EVOLU:LNG:bcd')
    })
    
    it('should add new rule by DSL', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('a').command('b', { params: ['one', 'two'] })
        })
        var code = new evolu.Code(lang)
        code.rule('a', ['a', 0], ['b', 'two'])
        
        expect(code._rules).to(eql, [{
            lines: [{ command: lang.commands.a },
                    { command: lang.commands.a, param: 0 },
                    { command: lang.commands.b, param: 'two' }],
            required: 2,
            id: 0
        }])
        expect(code.bytes).to(eql, [1, 1, 128, 2, 129, 0])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:\x01\x01\x80\x02\x81\x00')
    })
    
    it('should init command', function() {
        var result = ''
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.command('a', {
                init: function(param) {
                    result += 'a'
                    expect(this).to(be_an_instance_of, evolu.Code)
                    expect(this.currentRule.lines.length).to(be, 2)
                    expect(this.currentLine.command.name).to(be, 'a')
                    expect(param).to(be, 'one')
                }
            })
        }))
        code.rule(['a', 'one'], ['a', 'one'])
        expect(result).to(be, 'aa')
    })
    
    it('should init condition', function() {
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.condition('a', function() { this.inited = 1 })
        }))
        
        var one = code.rule(['a', 1], ['a'])
        var two = code.rule(['a', 1])
        
        expect(one.required).to(be, 2)
        expect(two.required).to(be, 1)
        expect(code._conditions).to(eql, { 'a 1': [one, two], 'a': [one] })
        
        expect(code).to(have_property, 'inited', 1)
    })
    
    it('should update running list', function() {
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.condition('if_a').condition('if_b')
        }))
        var rule0 = code.rule(['if_a'])
        var rule1 = code.rule(['if_a', 1], ['if_b', 2])
                   
        expect(code._toRun). to(eql, [])
        expect(code._toStop).to(eql, [])
        
        expect(rule0.required).to(be, 1)
        expect(rule1.required).to(be, 2)
        
        code.on('if_a')
        expect(code._running).to(eql, { })
        expect(rule0.required).to(be, 0)
        expect(rule1.required).to(be, 2)
        code.run()
        expect(code._running).to(eql, { 0: rule0 })
        
        code.on('if_a', 1)
        expect(rule1.required).to(be, 1)
        code.run()
        expect(code._running).to(eql, { 0: rule0 })
        
        code.on('if_b', 2)
        expect(rule1.required).to(be, 0)
        code.run()
        expect(code._running).to(eql, { 0: rule0, 1: rule1 })
        
        code.off('if_a')
        expect(code._running).to(eql, { 0: rule0, 1: rule1 })
        expect(rule0.required).to(be, 1)
        expect(rule1.required).to(be, 0)
        code.run()
        expect(code._running).to(eql, { 1: rule1 })
    })
    
    it('should run rules', function() {
        var currentCode, currentRule, currentLine, result = ''
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.condition('if_a').
                 condition('if_b').
                 command('one', function() {
                    result += '1'
                    currentCode = this
                    currentRule = this.currentRule
                    currentLine = this.currentLine
                 }).
                 command('two', function(param) {
                    result += '2'
                    expect(param).to(be, 'TWO')
                 })
        }))
        code.rule(['if_b'], ['two', 'NO'])
        var rule = code.rule(['if_a'], ['one'], ['two', 'TWO'])
        
        code.on('if_a')
        code.run()
        
        expect(result).to(be, '12')
        expect(currentCode).to(be, code)
        expect(currentRule).to(be, rule)
        expect(currentLine).to(be, rule.lines[1])
    })
    
    it('should change running list after run', function() {
        var result = ''
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.condition('if_a').
                 condition('if_b').
                 command('one', function() {
                    result += '1'
                    this.off('if_b')
                 }).
                 command('two', function(param) {
                    result += '2'
                 })
        }))
        code.rule(['if_a'], ['one'])
        code.rule(['if_b'], ['two'])
        
        code.on('if_a')
        code.on('if_b')
        code.run()
        code.run()
        
        expect(result).to(be, '121')
    })
    
    it('should initialize code', function() {
        var result = ''
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.condition('if_a').
                 command('one', function() { result += '1' }).
                 command('two', function() { result += '2' })
        }))
        var first  = code.rule(['if_a'], ['one'])
        var second = code.rule(['two'])
        var third  = code.rule(['one'], ['two'])
        
        expect(first).not_to(have_property, 'initializer', true)
        expect(second).to(have_property, 'initializer', true)
        expect(third).to(have_property, 'initializer', true)
        
        code.init()
        expect(result).to(be, '212')
    })
    
    it('should allow to listen events', function() {
        var code = new evolu.Code(evolu.lang('LNG', function() { }))
        var runned = ''
        
        code.listen('a', function(one, two) {
            runned += 'a'
            expect(one).to(be, 1)
            expect(two).to(be, 2)
            expect(this).to(be, code)
        })
        code.listen('a', function() { runned += 'A' })
        code.listen('b', function() { runned += 'b' })
        
        code.fire('a', [1, 2])
        code.fire('no')
        
        expect(runned).to(be, 'aA')
    })
})

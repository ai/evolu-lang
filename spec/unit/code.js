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
            this.condition('a').
                 command('b', { params: ['one', 'two'] })
        })
        var code = new evolu.Code(lang)
        code.rule(lang.commands.a.line(),
                  lang.commands.a.line(0),
                  lang.commands.b.line('two'))
        
        expect(code._rules).to(eql, [{
            lines: [lang.commands.a.line(),
                    lang.commands.a.line(0),
                    lang.commands.b.line('two')],
            required: 2,
            id: 0
        }])
        expect(code.bytes).to(eql, [1, 1, 128, 2, 129, 0])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:\x01\x01\x80\x02\x81\x00')
    })
    
    it('should init command', function() {
        var result = ''
        var lang = evolu.lang('LNG', function() {
            this.command('a', {
                init: function(param) {
                    result += 'a'
                    expect(this).to(be_an_instance_of, evolu.Code)
                    expect(this.currentRule.lines.length).to(be, 2)
                    expect(this.currentLine.command.name).to(be, 'a')
                    expect(param).to(be, 'one')
                }
            })
        })
        var code = new evolu.Code(lang)
        code.rule(lang.commands.a.line('one'), lang.commands.a.line('one'))
        expect(result).to(be, 'aa')
    })
    
    it('should init condition', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('a', function() { this.inited = 1 })
        })
        var code = new evolu.Code(lang)
        
        var one = code.rule(lang.commands.a.line(1), lang.commands.a.line())
        var two = code.rule(lang.commands.a.line(1))
        
        expect(one.required).to(be, 2)
        expect(two.required).to(be, 1)
        expect(code._conditions).to(eql, { 'a 1': [one, two], 'a': [one] })
        
        expect(code).to(have_property, 'inited', 1)
    })
    
    it('should update running list', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('if_a').condition('if_b')
        })
        var code = new evolu.Code(lang)
        var rule0 = code.rule(lang.commands.if_a.line())
        var rule1 = code.rule(lang.commands.if_a.line(1),
                              lang.commands.if_b.line(2))
                   
        expect(code._toRun).to(eql, [])
        expect(code._toStop).to(eql, [])
        
        expect(rule0.required).to(be, 1)
        expect(rule1.required).to(be, 2)
        
        code.up('if_a')
        expect(code._running).to(eql, { })
        expect(rule0.required).to(be, 0)
        expect(rule1.required).to(be, 2)
        code.run()
        expect(code._running).to(eql, { 0: rule0 })
        
        code.up('if_a', 1)
        expect(rule1.required).to(be, 1)
        code.run()
        expect(code._running).to(eql, { 0: rule0 })
        
        code.up('if_b', 2)
        expect(rule1.required).to(be, 0)
        code.run()
        expect(code._running).to(eql, { 0: rule0, 1: rule1 })
        
        code.down('if_a')
        expect(code._running).to(eql, { 0: rule0, 1: rule1 })
        expect(rule0.required).to(be, 1)
        expect(rule1.required).to(be, 0)
        code.run()
        expect(code._running).to(eql, { 1: rule1 })
    })
    
    it('should run rules', function() {
        var currentCode, currentRule, currentLine, result = ''
        var lang = evolu.lang('LNG', function() {
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
        })
        var code = new evolu.Code(lang)
        code.rule(lang.commands.if_b.line(), lang.commands.two.line('NO'))
        var rule = code.rule(lang.commands.if_a.line(),
                             lang.commands.one.line(),
                             lang.commands.two.line('TWO'))
        
        code.up('if_a')
        code.run()
        
        expect(result).to(be, '12')
        expect(currentCode).to(be, code)
        expect(currentRule).to(be, rule)
        expect(currentLine).to(be, rule.lines[1])
    })
    
    it('should change running list after run', function() {
        var result = ''
        var lang = evolu.lang('LNG', function() {
            this.condition('if_a').
                 condition('if_b').
                 command('one', function() {
                    result += '1'
                    this.down('if_b')
                 }).
                 command('two', function(param) {
                    result += '2'
                 })
        })
        var code = new evolu.Code(lang)
        code.rule(lang.commands.if_a.line(), lang.commands.one.line())
        code.rule(lang.commands.if_b.line(), lang.commands.two.line())
        
        code.up('if_a')
        code.up('if_b')
        code.run()
        code.run()
        
        expect(result).to(be, '121')
    })
    
    it('should initialize code', function() {
        var result = ''
        var lang = evolu.lang('LNG', function() {
            this.condition('if_a').
                 command('one', function() { result += '1' }).
                 command('two', function() { result += '2' })
        })
        var code = new evolu.Code(lang)
        var first  = code.rule(lang.commands.if_a.line(),
                               lang.commands.one.line())
        var second = code.rule(lang.commands.two.line())
        var third  = code.rule(lang.commands.one.line(),
                               lang.commands.two.line())
        
        expect(first).not_to(have_property, 'initializer', true)
        expect(second).to(have_property, 'initializer', true)
        expect(third).to(have_property, 'initializer', true)
        
        code.init()
        expect(result).to(be, '212')
    })
})

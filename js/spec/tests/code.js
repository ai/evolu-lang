JSpec.describe('evolu.lang.Code', function() {
    it('should return original program bytes', function() {
        evolu.lang.add('LNG', function() { })
        var code = evolu.lang.compile('EVOLU:LNG:abc')
        expect(code.bytes).to(eql, [97, 98, 99])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:abc')
        
        code.bytes = [98, 99, 100]
        expect(code.toSource()).to(eql, 'EVOLU:LNG:bcd')
    })
    
    it('should add new rule by DSL', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.condition('a').command('b', { params: ['one', 'two'] })
        })
        var code = new evolu.lang.Code(lang)
        code.rule('a', ['a', 0], ['b', 'two'])
        
        expect(code.rules).to(eql, [{
            lines: [{ command: lang.commands.a },
                    { command: lang.commands.a, param: 0 },
                    { command: lang.commands.b, param: 'two' }],
            code: code,
            on: evolu.lang.Rule.prototype.on,
            off: evolu.lang.Rule.prototype.off,
            run: evolu.lang.Rule.prototype.run,
            required: 2,
            id: 0
        }])
        expect(code.bytes).to(eql, [1, 1, 128, 2, 129, 0])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:\x01\x01\x80\x02\x81\x00')
    })
    
    it('should init command', function() {
        var result = ''
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.command('a', {
                init: function(param) {
                    result += 'a'
                    expect(this).to(be_an_instance_of, evolu.lang.Code)
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
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.condition('a', function() { this.inited = 1 })
        }))
        
        var one = code.rule(['a', 1], ['a'])
        var two = code.rule(['a', 1])
        
        expect(one.required).to(be, 2)
        expect(two.required).to(be, 1)
        expect(code._conditions).to(eql, { 'a 1': [one, two], 'a': [one] })
        
        expect(code).to(have_property, 'inited', 1)
    })
    
    it('should have condition index', function() {
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.condition('a').condition('b')
        }))
        code.rule(['a'], ['b', 1])
        code.rule(['a', 2], ['b', 1])
        
        expect(code.conditions('a')).to(eql,    [code.rules[0]])
        expect(code.conditions('a', 2)).to(eql, [code.rules[1]])
        expect(code.conditions('b', 1)).to(eql, [code.rules[0], code.rules[1]])
        expect(code.conditions('b', 2)).to(be_empty)
    })
    
    it('should enable/disable rule', function() {
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.condition('if_a').condition('if_b')
        }))
        var rule = code.rule('if_a', 'if_b')
        
        expect(code._changes). to(eql, [])
        expect(rule.required).to(be, 2)
        
        rule.on()
        expect(code._changes).to(be_empty)
        expect(rule.required).to(be, 1)
        
        rule.off()
        expect(code._changes).to(be_empty)
        expect(rule.required).to(be, 2)
        
        rule.on(2)
        rule.off(2)
        rule.on(2)
        expect(code._changes).to(eql, { 0: ['add', rule] })
        expect(rule.required).to(be, 0)
        
        code.run()
        expect(code._running).to(eql, { 0: rule })
        expect(code._changes). to(be_empty)
        
        rule.off(2)
        rule.on(2)
        rule.off(2)
        expect(code._changes).to(eql, { 0: ['del', rule] })
        expect(code._running).to(eql, { 0: rule })
        
        code.run()
        expect(code._running).to(be_empty)
    })
    
    it('should enable/disable rules by condition', function() {
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.condition('if_a').condition('if_b')
        }))
        var rule0 = code.rule(['if_a'])
        var rule1 = code.rule(['if_a', 1], ['if_b', 2])
        
        var changes = ''
        rule0.on = rule1.on = function(count) {
            changes += this.id + '+' + (count || 1) + ' '
        }
        rule0.off = rule1.off = function(count) {
            changes += this.id + '-' + (count || 1) + ' '
        }
        
        code.on('if_a')
        code.on('if_a', 1)
        code.on('if_b', 2)
        code.off('if_a')
        
        expect(changes).to(be, '0+1 1+1 1+1 0-1 ')
    })
    
    it('should run rules', function() {
        var currentCode, currentRule, currentLine, result = ''
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
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
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
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
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
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
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() { }))
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

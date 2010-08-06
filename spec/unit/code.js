JSpec.describe('darwin.Code', function() {
    it('should return original program bytes', function() {
        evolu.lang('LNG', function() { })
        var code = evolu.compile('EVOLU:LNG:abc')
        expect(code.bytes).to(eql, [97, 98, 99])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:abc')
    })
    
    it('should update running list', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('if_a').condition('if_b')
        })
        var code = new evolu.Code(lang)
        var rule0 = code._add([{ command: lang._commands[1] }])
        var rule1 = code._add([{ command: lang._commands[1],  param: 1 },
                               { command: lang._commands[2],  param: 2 }])
                   
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
        code._add([{ command: lang._commands[2] },
                   { command: lang._commands[4], param: 'NO' }])
        var rule = code._add([{ command: lang._commands[1] },
                              { command: lang._commands[3] },
                              { command: lang._commands[4], param: 'TWO' }])
        
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
        code._add([{ command: lang._commands[1] },
                   { command: lang._commands[3] }])
        code._add([{ command: lang._commands[2] },
                   { command: lang._commands[4] }])
        
        code.up('if_a')
        code.up('if_b')
        code.run()
        code.run()
        
        expect(result).to(be, '121')
    })
})

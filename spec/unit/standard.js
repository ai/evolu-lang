JSpec.describe('evolu.standard', function() {
    it('should add variables', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(evolu.standard.variables)
        })
        
        expect(lang._list.length).to(be, 4)
        
        var code = new evolu.Code(lang)
        code.rule(lang.commands.var_up.line(2))
        code.rule(lang.commands.if_var_more_0.line(1),
                  lang.commands.var_down.line(1))
        code.rule(lang.commands.if_var_more_0.line(2),
                  lang.commands.var_down.line(2),
                  lang.commands.var_up.line(1),
                  lang.commands.var_up.line(1))
        
        expect(code._variables).to(eql, { 1: 0, 2: 0 })
        
        code._originalRun = code._runRule
        var runned = ''
        code._runRule = function(rule) {
            runned += rule.id
            this._originalRun(rule)
        }
        
        code.init()
        expect(code._variables).to(eql, { 1: 0, 2: 1 })
        code.run()
        expect(code._variables).to(eql, { 1: 2, 2: 0 })
        code.run()
        expect(code._variables).to(eql, { 1: 1, 2: 0 })
        code.run()
        expect(code._variables).to(eql, { 1: 0, 2: 0 })
        code.run()
        expect(code._variables).to(eql, { 1: 0, 2: 0 })
        code.run()
        
        expect(runned).to(be, '0211')
    })
    
    it('should allow add variables command', function() {
        var pack = evolu.lang('PACK', function() {
            this.add(evolu.standard.variables)
        })
        var separated = evolu.lang('SEP', function() {
            this.add(evolu.standard.variables.moreZero)
            this.add(evolu.standard.variables.increase)
            this.add(evolu.standard.variables.decrease)
        })
        
        expect(pack._list.length).to(eql, separated._list.length)
    })
})

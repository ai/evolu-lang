JSpec.describe('evolu.standard', function() {
    it('should add variables', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(evolu.standard.variables)
        })
        
        expect(lang._list.length).to(be, 4)
        
        var code = new evolu.Code(lang)
        code.rule(['var_up',        2],
                  ['var_up'          ])
        code.rule(['if_var_more_0', 1],
                  ['var_down',      1])
        code.rule(['if_var_more_0', 2],
                  ['var_down',      2],
                  ['var_up',        1],
                  ['var_up',        1])
        
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
    
    it('should fire event when change variable', function() {
        var code = new evolu.Code(evolu.lang('LNG', function() {
            this.add(evolu.standard.variables)
        }))
        
        code.rule(['var_up', 2], ['var_down'], ['var_down', 1])
        
        var changes = []
        code.listen('var_changed', function(name, value, diff) {
            changes.push([name, value, diff])
        })
        
        code.init()
        
        expect(changes).to(eql, [[2, 1, 1], [1, -1, -1]])
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

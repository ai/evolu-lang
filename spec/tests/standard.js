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
        
        evolu.Rule.prototype._originalRun = evolu.Rule.prototype.run
        var runned = ''
        evolu.Rule.prototype.run = function() {
            runned += this.id
            this._originalRun()
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
        
        evolu.Rule.prototype.run = evolu.Rule.prototype._originalRun
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
    
    it('should add input signals', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(evolu.standard.signals.input('a', 'b'))
        })
        expect(lang._list.length).to(be, 2)
      
        var code = new evolu.Code(lang)
        code.rule(['if_signal', 'a'])
        code.rule(['if_signal', 'a'], ['if_signal', 'b'])
        code.rule(['if_signal', 'b'], ['if_signal', 'b'])
        
        evolu.Rule.prototype._originalRun = evolu.Rule.prototype.run
        var runned = ''
        evolu.Rule.prototype.run = function() {
            runned += this.id
            this._originalRun()
        }
        
        code.signal('a')
        code.signal('b')
        code.run()
        
        expect(runned).to(be, '0112')
        
        evolu.Rule.prototype.run = evolu.Rule.prototype._originalRun
    })
    
    it('should add output signals', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(evolu.standard.signals.output('a', 'b'))
        })
        expect(lang._list.length).to(be, 2)
      
        var code = new evolu.Code(lang)
        code.rule(['send_signal', 'a'],
                  ['send_signal', 'a'],
                  ['send_signal', 'b'])
        
        var output = ''
        code.listen('receive_signal', function(signal) {
            output += signal
        })
        code.init()
        
        expect(output).to(be, 'aab')
    })
    
    it('should convert bytes to signal names', function() {
        var lang = evolu.lang('LNG', function() {
            this.add(evolu.standard.signals.input('in_a', 'in_b'))
            this.add(evolu.standard.signals.output('out_a', 'out_b'))
        })
        code = lang.compile([1, 128, 1, 129, 1, 130,
                             2, 128, 2, 129, 2, 130])
        rule = code.rules[0]
        
        expect(rule.lines[0].param).to(be, 'in_a')
//        expect(rule.lines[1].param).to(be, 'in_b')
//        expect(rule.lines[2].param).to(be, 'in_a')
//        expect(rule.lines[3].param).to(be, 'out_a')
//        expect(rule.lines[4].param).to(be, 'out_b')
//        expect(rule.lines[5].param).to(be, 'out_a')
    })
})

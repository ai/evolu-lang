describe('evolu.lang.standard', function() {
    it('should add variables', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.add(evolu.lang.standard.variables)
        })
        expect(lang._list.length).toEqual(4)
        
        var code = new evolu.lang.Code(lang)
        code.rule(['var_up',        2],
                  ['var_up'          ])
        code.rule(['if_var_more_0', 1],
                  ['var_down',      1])
        code.rule(['if_var_more_0', 2],
                  ['var_down',      2],
                  ['var_up',        1],
                  ['var_up',        1])
        
        expect(code._variables).toEqual({ 1: 0, 2: 0 })
        
        evolu.lang.Rule.prototype._originalRun = evolu.lang.Rule.prototype.run
        var runned = ''
        evolu.lang.Rule.prototype.run = function() {
            runned += this.id
            this._originalRun()
        }
        
        code.init()
        expect(code._variables).toEqual({ 1: 0, 2: 1 })
        code.run()
        expect(code._variables).toEqual({ 1: 2, 2: 0 })
        code.run()
        expect(code._variables).toEqual({ 1: 1, 2: 0 })
        code.run()
        expect(code._variables).toEqual({ 1: 0, 2: 0 })
        code.run()
        expect(code._variables).toEqual({ 1: 0, 2: 0 })
        code.run()
        
        expect(runned).toEqual('0211')
        
        evolu.lang.Rule.prototype.run = evolu.lang.Rule.prototype._originalRun
    })
    
    it('should fire event when change variable', function() {
        var code = new evolu.lang.Code(evolu.lang.add('LNG', function() {
            this.add(evolu.lang.standard.variables)
        }))
        
        code.rule(['var_up', 2], ['var_down'], ['var_down', 1])
        
        var changes = []
        code.listen('var_changed', function(name, value, diff) {
            changes.push([name, value, diff])
        })
        
        code.init()
        
        expect(changes).toEqual([[2, 1, 1], [1, -1, -1]])
    })
    
    it('should allow add variables command', function() {
        var pack = evolu.lang.add('PACK', function() {
            this.add(evolu.lang.standard.variables)
        })
        var separated = evolu.lang.add('SEP', function() {
            this.add(evolu.lang.standard.variables.moreZero)
            this.add(evolu.lang.standard.variables.increase)
            this.add(evolu.lang.standard.variables.decrease)
        })
        
        expect(pack._list.length).toEqual(separated._list.length)
    })
    
    it('should add input signals', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.add(evolu.lang.standard.input('a', 'b'))
        })
        expect(lang._list.length).toEqual(2)
      
        var code = new evolu.lang.Code(lang)
        code.rule(['if_signal', 'a'])
        code.rule(['if_signal', 'a'], ['if_signal', 'b'])
        code.rule(['if_signal', 'b'], ['if_signal', 'b'])
        
        evolu.lang.Rule.prototype._originalRun = evolu.lang.Rule.prototype.run
        var runned = ''
        evolu.lang.Rule.prototype.run = function() {
            runned += this.id
            this._originalRun()
        }
        
        code.signal('a')
        code.signal('b')
        code.run()
        
        expect(runned).toEqual('0112')
        
        evolu.lang.Rule.prototype.run = evolu.lang.Rule.prototype._originalRun
    })
    
    it('should add output signals', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.add(evolu.lang.standard.output('a', 'b'))
        })
        expect(lang._list.length).toEqual(2)
      
        var code = new evolu.lang.Code(lang)
        code.rule(['send_signal', 'a'],
                  ['send_signal', 'a'],
                  ['send_signal', 'b'])
        
        var output = ''
        code.listen('receive_signal', function(signal) {
            output += signal
        })
        code.init()
        
        expect(output).toEqual('aab')
    })
    
    it('should convert bytes to signal names', function() {
        var lang = evolu.lang.add('LNG', function() {
            this.add(evolu.lang.standard.input('in_a', 'in_b'))
            this.add(evolu.lang.standard.output('out_a', 'out_b'))
        })
        code = lang.compile([1, 128, 1, 129, 1, 130,
                             2, 128, 2, 129, 2, 130])
        rule = code.rules[0]
        
        expect(rule.lines[0].param).toEqual('in_a')
        expect(rule.lines[1].param).toEqual('in_b')
        expect(rule.lines[2].param).toEqual('in_a')
        expect(rule.lines[3].param).toEqual('out_a')
        expect(rule.lines[4].param).toEqual('out_b')
        expect(rule.lines[5].param).toEqual('out_a')
    })
})

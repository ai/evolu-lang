JSpec.describe('darwin.Code', function() {
    it('should return original program bytes', function() {
        evolu.lang('LNG', function() { })
        var code = evolu.compile('EVOLU:LNG:abc')
        expect(code.bytes).to(eql, [97, 98, 99])
        expect(code.toSource()).to(eql, 'EVOLU:LNG:abc')
    })
    
    it('should add rules to running list', function() {
        var lang = evolu.lang('LNG', function() {
            this.condition('if_a').condition('if_b')
        })
        var code = lang.compile([1, 0, 1, 128, 2, 129])
        expect(code._running).to(eql, { })
        
        expect(code._rules[0].required).to(be, 1)
        expect(code._rules[1].required).to(be, 2)
        
        code.up('if_a')
        expect(code._rules[0].required).to(be, 0)
        expect(code._rules[1].required).to(be, 2)
        expect(code._running).to(eql, { 0: code._rules[0] })
        
        code.up('if_a', 0)
        expect(code._rules[1].required).to(be, 1)
        expect(code._running).to(eql, { 0: code._rules[0] })
        
        code.up('if_b', 1)
        expect(code._rules[1].required).to(be, 0)
        expect(code._running).to(eql, { 0: code._rules[0], 1: code._rules[1] })
        
        code.down('if_a')
        expect(code._rules[0].required).to(be, 1)
        expect(code._rules[1].required).to(be, 0)
        expect(code._running).to(eql, { 1: code._rules[1] })
    })
})

JSpec.describe('evolu', function() {
    
    it('should calculate odd or even signals was be received', function() {
        evolu.lang('ODD-EVEN', function() {
            this.add(evolu.standard.input('tick', 'result'))
            this.add(evolu.standard.output('odd', 'even'))
            this.add(evolu.standard.variables)
        })
        
        // rule 0:
        //     var_up 0
        // rule 1:
        //   ? if_signal     tick
        //   ? if_var_more_0 0
        //     var_down      0
        //     var_up        1
        // rule 2:
        //   ? if_signal     tick
        //   ? if_var_more_0 1
        //     var_down      1
        //     var_up        0
        // rule 3:
        //   ? if_signal     result
        //   ? if_var_more_0 0
        //     send_signal   even
        // rule 4:
        //   ? if_signal     result
        //   ? if_var_more_0 1
        //     send_signal   odd
        
        var code = evolu.compile('EVOLU:ODD-EVEN:' +
                                 '\x04\x80\x00' +
                                 '\x01\x80\x03\x80\x05\x80\x04\x81\x00' +
                                 '\x01\x80\x03\x81\x05\x81\x04\x80\x00' +
                                 '\x01\x81\x03\x80\x02\x81\x00' +
                                 '\x01\x81\x03\x81\x02\x80')
        
        var result = ''
        code.listen('receive_signal', function(signal) {
            result += signal + ' '
        })
        
        code.init()
        code.signal('result')
        expect(result).to(be, 'even ')
        
        code.signal('tick').signal('tick').signal('tick').signal('result')
        expect(result).to(be, 'even odd ')
        
        code.signal('tick').signal('result')
        expect(result).to(be, 'even odd even ')
    })
    
})

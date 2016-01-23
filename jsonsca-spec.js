'use strict';
var jsonsca = require('./jsonsca.js')


describe("ReferenceTracker", function(){
  it("remembers an object", function(){
    let obj = {x: 1}
    let rt = new jsonsca.ReferenceTracker()
    let ref1 = rt.reference(obj)
    let ref2 = rt.reference(obj)

    expect(ref1).toEqual(jasmine.objectContaining({"new": '1'}))
    expect(ref2).toEqual(jasmine.objectContaining({"ref": '1'}))
  })
})


describe("Plain data types:", function() {
  it("Regular numbers are preserved", function(done) {
    jsonsca.pack(42).then(function(s){
      var o = jsonsca.unpack(s);
      expect(o).toEqual(42)
      expect(o).not.toEqual("42")
      done()
    })
  });

  it("Regular strings are preserved", function(done) {
    jsonsca.pack("foo bar").then(function(s){
      expect(jsonsca.unpack(s)).toEqual("foo bar")
      done()
    })
  });

  [true, false, undefined, null].forEach(function(o){
    it(`Atomic ${o} are preserved`, function(done) {
      jsonsca.pack(o).then(function(s){
        expect(jsonsca.unpack(s)).toEqual(o)
        done()
      })
    });
  })

  it("Arrays are preserved", function(done) {
    let array = [1, 2, 3]
    jsonsca.pack(array).then(function(s){
      let unpacked_array = jsonsca.unpack(s)
      expect(unpacked_array.length).toEqual(array.length)
      expect(unpacked_array[0]).toEqual(array[0])
      expect(unpacked_array[1]).toEqual(array[1])
      expect(unpacked_array[2]).toEqual(array[2])
      done()
    }, function(err) {
      console.error(err)
    })
  });

  it("Object properties are preserved", function(done) {
    let obj = {"key": "value"}
    jsonsca.pack(obj).then(function(s){
      try {
        let unpacked = jsonsca.unpack(s)
        expect(unpacked.key).toEqual(obj.key)
      } catch(e) {
        console.error(e)
      }
      done()
    }, function(err) {
      console.error(err)
    })
  });

  it("Date are preserved", function(done) {
    let d = new Date(1984, 3, 12)
    jsonsca.pack(d).then(function(s){
      let unpacked = jsonsca.unpack(s)
      expect(unpacked).toEqual(d)
      done()
    }, function(err) {
      console.error(err)
    })
  });

  it("preserves shared references in arrays", function(done){
    let a = {x: 1}
    jsonsca.pack([a, a]).then(function(s) {
      try {
        let unpacked = jsonsca.unpack(s)
        unpacked[0].x += 1
        expect(unpacked[1].x).toEqual(2)
      } catch(e) {
        console.error(e)
        fail(e)
      }
      done()
    }, function(err) {
      fail(err)
    })
  })

  it("preserves shared references in objects", function(done){
    let a = {x: 1}
    let b = {y: a}
    let c = {y: a}
    jsonsca.pack({b, c}).then(function(s) {
      try {
        let unpacked = jsonsca.unpack(s)
        console.log(unpacked)
        unpacked.b.y.x += 1
        expect(unpacked.c.y.x).toEqual(2)
      } catch(e) {
        console.error(e)
        fail(e)
      }
      done()
    }, function(err) {
      fail(err)
    })
  })
});

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

describe("the pack() utility", function() {
  [true, false, 42, "string"].forEach(function(o){
    it(`Atomic ${o} are preserved`, function(done) {
      jsonsca.pack(o).then(function(s){
        expect(s).toEqual(o)
        done()
      })
    });
  })

  it("represents undefined", function(done){
    jsonsca.pack(undefined).then(function(s){
      expect(s.undefined).toBe(true)
      done()
    })
  })

  it("represents null", function(done){
    jsonsca.pack(null).then(function(s){
      expect(s.null).toBe(true)
      done()
    })
  })

  it("wraps arrays with 'array' and an 'id'", function(done){
    jsonsca.pack([1]).then(function(s){
      expect(s.id).toEqual('1')
      expect(s.array).toEqual([1])
      done()
    })
  })

  it("wraps objects with 'object' and an 'id'", function(done){
    jsonsca.pack({x: 42}).then(function(s){
      expect(s.id).toEqual('1')
      expect(s.object.x).toEqual(42)
      done()
    })
  })

  it("recycles objects it has seen before", function(done) {
    let rt = new jsonsca.ReferenceTracker()
    let obj = {x: 42}
    jsonsca.pack(obj, rt).then(function(s1){
      jsonsca.pack(obj, rt).then(function(s2){
        expect(s1.id).toEqual(s2.reference)
        done()
      })
    })
  })

  it("recycles objects within arrays", function(done) {
    let rt = new jsonsca.ReferenceTracker()
    let obj = {x: 42}
    let array = [obj, obj]
    jsonsca.pack(array, rt).then(function(s){
      expect(s.array[0].id).toEqual(s.array[1].reference)
      done()
    })
  })

  it("nests objects", function(done) {
    let obj = {a: {b: 1}}
    jsonsca.pack(obj).then(function(s){
      expect(s.object.a.object.b).toEqual(1)
      done()
    })
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
    let obj = {b: b, c: c}
    jsonsca.pack(obj).then(function(s) {
      try {
        let unpacked = jsonsca.unpack(s)
        unpacked.b.y.x += 1
        expect(unpacked.c.y.x).toEqual(2)
      } catch(e) {
        console.error("error:", e)
        fail(e)
      }
      done()
    }, function(err) {
      fail(err)
    })
  })
});

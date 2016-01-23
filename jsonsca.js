// JSON/SCA is a way to represent more datatypes than allowed by JSON
//
// Currently supports:
// - strings
// - numbers
// - booleans
// - null
// - undefined
// - arrays
// - objects
// - dates
// - File
// - FileList
// - Blob
// - ImageData
//
// Will support:
// - cyclic graphs of references

if (typeof ImageData === "undefined") {
    function ImageData(){}
}
if (typeof File === "undefined") {
    function File(){}
}
if (typeof FileList === "undefined") {
    function FileList(){}
}
if (typeof Blob === "undefined") {
    function Blob(){}
}


module.exports.pack = function(input, reftracker) {
    var reftracker;
    return new Promise(function(resolve, reject) {
        var t = typeof input;
        if (typeof reftracker === 'undefined') {
            reftracker = new ReferenceTracker();
        }
        var reference = reftracker.reference(input);
        if (reference && reference.ref) {
            resolve({'reference': reference.ref});
        } else if (t === 'string' || t === 'number' || t === 'boolean') {
            resolve(input);
        } else if (t === 'undefined') {
            resolve({'undefined': true});
        } else if (input === null) {
            resolve({'null': true});
        } else if (input instanceof Date) {
            resolve({'date': input.getTime()});
        } else if (input instanceof RegExp) {
            resolve({'regexp': {'source': input.source}});
        } else if (input instanceof ImageData) {
            var blob = new Blob([input.data]);
            var reader = new FileReader();
            var out = {
                'id': reference['new'],
                'imagedata': {
                    width: input.width,
                    height: input.height,
                    data: undefined,
                }
            };
            reader.onloadend = function() {
                out.imagedata.data = reader.result;
                resolve(out);
            };
            reader.onerror = function() {
                reject("Could not serialize");
            };
            reader.readAsBinaryString(blob);
        } else if (input instanceof File || input instanceof Blob) {
            var type = (input instanceof File) ? 'file' : 'blob';
            var out = {
                'id': reference['new'],
            };
            out[type] = {
                contents: null,
                properties: {
                    type: input.type,
                }
            };
            if (input instanceof File) {
                out[type].properties.name = input.name;
            }
            var reader = new FileReader();
            reader.onloadend = function() {
                out[type].contents = reader.result;
                resolve(out);
            };
            reader.onerror = function() {
                promise.error("Could not serialize");
            };
            reader.readAsBinaryString(input);
        } else if (input instanceof Array || input instanceof FileList) {
            var promises = [];
            for (var i=0; i < input.length; i++) {
                promises.push(module.exports.pack(input[i], reftracker));
            }
            Promise.all(promises).then(function(results) {
                resolve({
                    'id': reference['new'],
                    'array': results
                });
            });
        } else {

            // If nothing else, treat this as a simple object and pack the properties

            var promises = [];
            var out = {};
            var proppromise;
            for (prop in input) {
                if (input.hasOwnProperty(prop)) {
                    proppromise = module.exports.pack(input[prop], reftracker);
                    (function(prop){
                        proppromise.then(function(res){
                            console.log(res);
                            out[prop] = res;
                        })
                    })(prop);
                    promises.push(proppromise);
                }
            }
            var wait = Promise.all(promises);
            wait.then(function() {
                resolve({
                    'id': reference['new'],
                    'object': out,
                });
            });
        }
    })
};

module.exports.unpack = function(input, references) {
    var t = typeof input;
    var references = references||{};
    var id = input.id;

    // string, number, boolean
    if (t !== 'object') {
        return input;
    }

    if (input['reference']) {
        return references[input.reference];
    }

    if (input['null']) {
        return null;
    }

    if (input['date']) {
        var out = new Date();
        out.setTime(input['date']);
        return out;
    }

    if (input['imagedata']) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var out = ctx.createImageData(input.imagedata.width, input.imagedata.height);
        references[input.id] = out;
        for (var i=0; i < input.imagedata.data.length; i++) {
            out.data[i] = input.imagedata.data.charCodeAt(i);
        }
        return out;
    }

    if (input['file'] || input['blob']) {
        var inputdata = input['file'] || input['blob'];
        var ab = new ArrayBuffer(inputdata.contents.length);
        var ia = new Uint8Array(ab);
        for (var i=0; i<inputdata.contents.length; i++) {
            ia[i] = inputdata.contents.charCodeAt(i);
        }
        var out = new Blob([ia],
            {type: inputdata.properties.type}
        );
        references[input.id] = out;
        if (input['file']) {
            out.name = inputdata.properties.name;
        }
        return out;
    }

    if (input['undefined']) {
        return undefined;
    }

    if (input['array']) {
        if (typeof input.id === 'undefined') {
            console.trace("no id:", input);
            throw "Input has no ID:";
        }
        var out = [];
        references[input.id] = out;
        for (var i=0; i < input.array.length; i++) {
            out.push(module.exports.unpack(input.array[i], references));
        }
        return out;
    };

    if (input['object']) {
        if (typeof input.id === 'undefined') {
            console.trace("no id:", input);
            throw "Input has no ID:";
        }
        var out = {}
        references[input.id] = out;
        for (prop in input['object']) {
            out[prop] = module.exports.unpack(input['object'][prop], references);
        }
        return out;
    }
};

module.exports.parse = function(data) {
    return module.exports.unpack(JSON.parse(data));
};

module.exports.stringify = function(data) {
    var pack_promise = module.exports.pack(data);
    var stringify_promise = new Promise();
    pack_promise.then(function(packed) {
        stringify_promise.ok(JSON.stringify(packed));
    });
    return stringify_promise;
};

function map(func, data) {
    var out = [];
    var i;
    for (i=0; i<data.length; i++) {
        out.push(func(data[i]));
    }
    return out;
};

function objsize(obj) {
    var c = 0;
    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
            c++;
        }
    }
    return c;
};

function ReferenceTracker() {
    this.tracked = {};
    this.next_id = 1;
};
ReferenceTracker.prototype.reference = function(obj) {
    var t = typeof obj;
    if (t === 'object') {
        for (ref in this.tracked) {
            if (this.tracked[ref] === obj) {
                return {'ref': ref.toString()};
            }
        }
        var ref = this.next_id;
        this.tracked[this.next_id] = obj;
        this.next_id++;
        return {'new': ref.toString()};
    } else {
        return null;
    }
};
module.exports.ReferenceTracker = ReferenceTracker;

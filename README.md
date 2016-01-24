# JSON SCA

A serialization tool supporting HTML5 Structured Clone Algorithm types.

You can read more about the SCA types from MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm

The algorithm is part of HTML5 specifications that define things like what types
may be stored in IndexedDB and how data is transferred between Web Workers and iFrames
via the `postMessage()` API. This covers a much wider range of types than JSON, which
`postMessage()` originally used, but is not actually a serialization format. SCA only
defines how the data is copied across boundaries, not any way to actually represent this.

## API

### `jsonsca.stringify(obj)`

Serialization a compatible object into a string.

### `jsonsca.parse(string)`

Deserialize data previously serialized. Preserves multiple references to shared objects and
cyclic references.

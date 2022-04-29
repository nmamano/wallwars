The frontend is based on React, and it was created with Create-React-App. It uses the emscripten pipeline to run the C++-native AI on the web. This complicates the workflow a bit.

The current workflow is to do the following steps from the `frontend` folder (the goal is to automate the workflow further in the future). Steps 1-to-3 are only necessary after modifying the AI.

1. Run

```
$ source  ../../../emsdk/emsdk_env.sh
```

This is so that we can compile with the em++ compiler (assumes you have installed the emscripten toolchain; your relative path may be different).

2. Compile `src/ai.cc`, producing `src/ai.mjs`.

```
make -B
```

The file `src/ai.cc` does not have a main function, it just contains library functions. The js code can call those functions by importing `createModule` from `ai.mjs` and then using `Module.cwrap`.

3. Add `/* eslint-disable */` to the top of `src/ai.mjs`:

```
sed -i '1 i\/* eslint-disable */' src/ai.mjs
```

Otherwise, react crashes immediately due to lint errors.

4. Start the react app as usual:

```
npm run start
```

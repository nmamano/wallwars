The frontend is based on React, and it was created with Create-React-App. It uses the emscripten pipeline to run the C++-native AI on the web. This complicates the workflow a bit.

The current workflow is to do the following steps from the `frontend` folder (the goal is to automate the workflow further in the future). Steps 1-to-3 are only necessary after modifying the AI.

1. Run

```
$ source  ../../../emsdk/emsdk_env.sh
```

This is so that we can compile with the em++ compiler (assumes you have installed the emscripten toolchain; your relative path may be different).

2. Run

```
make -B
```

This compiles `src/ai.cc`, producing `src/ai.mjs`. The file `src/ai.cc` does not have a main function, it just contains library functions that we export so that they can be called from javascript code. The functions are imported in `src/App.js`.

3. Add this line to the top of `src/ai.mjs`:

```
/* eslint-disable */
```

Otherwise, eslint will crash immediately due to lint errors when running the react app.

4. Start the react app as usual:

```
npm run start
```

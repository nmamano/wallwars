src/ai.mjs: src/ai.cc
	em++ --no-entry src/ai.cc -o src/ai.mjs  \
		-s ENVIRONMENT='web'  \
		-s SINGLE_FILE=1  \
		-s EXPORT_NAME='createModule'  \
		-s USE_ES6_IMPORT_META=0  \
		-s EXPORTED_FUNCTIONS='["_GetMove"]'  \
		-s EXPORTED_RUNTIME_METHODS='["cwrap"]'  \
		-s TOTAL_MEMORY=600MB \
		-s INITIAL_MEMORY=600MB \
		-O3 \
		-march=haswell \
		-flto=full

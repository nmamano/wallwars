TARGET = prog
LIBS = -lm
CC = g++
CFLAGS = -std=c++17 -Wall -O3 -DNDEBUG
DFLAGS = -std=c++17 -O0 -g3 -ggdb -Wall -Wextra -Wconversion -Wunused -Wshadow -Wold-style-cast 
.PHONY: default all clean

default: $(TARGET)
all: default

OBJECTS = $(patsubst %.cc, %.o, $(wildcard *.cc))
HEADERS = $(wildcard *.h)

%.o: %.cc $(HEADERS)
	$(CC) $(CFLAGS) -c $< -o $@

.PRECIOUS: $(TARGET) $(OBJECTS)

$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) -Wall $(LIBS) -o a.out

clean:
	-rm -f *.o
	-rm -f a.out
#!/bin/sh
# Run a command; print its output only if it fails. Used by ralph feedback gates
# so successful runs produce no output signatures.
out=$("$@" 2>&1)
status=$?
[ $status -ne 0 ] && printf '%s\n' "$out"
exit $status

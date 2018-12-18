#!/usr/bin/env python
import os
import sys
import math
import soundfile
import subprocess

WINDOW_SIZE = 5 # seconds

def audio_length(audio_file):
    return float(subprocess.check_output(["soxi", "-D", audio_file]).strip())

def find_proportion(audio_file):
    best_remainder = 0
    best_proportion = 0
    al = audio_length(audio_file)
    if al <= 25:
        return al
    for i in range(15, 26):
        q, r = divmod(al, i)
        if r > 10 and r > best_remainder:
            best_remainder = r
            best_proportion = i
        else:
            continue
    return best_proportion

if __name__ == "__main__":
    audio_file = sys.argv[1]
    with soundfile.SoundFile(audio_file, 'r') as f:
        seq = 0
        p = find_proportion(audio_file)
        q, r = divmod(audio_length(audio_file), p)
        blocks = q if r == 0 else q + 1
        for seq in range(int(blocks)):
            data = f.read(int(math.ceil((p + WINDOW_SIZE) * f.samplerate)))
            outname = os.path.splitext(audio_file)[0] + '-' + str(seq) + '.wav'
            soundfile.write(outname, data, f.samplerate)
            f.seek(f.tell() - (WINDOW_SIZE * f.samplerate))

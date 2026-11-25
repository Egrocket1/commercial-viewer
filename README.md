# Commercial Viewer · Windows detector components

A Windows application I built with AI assistance that detects commercial breaks during sports broadcasts and controls when the receiver mutes and restores sound.

## Engineering decision

A commercial can include footage that looks like live play. Commercial Viewer weighs broadcast cues before deciding that the game has returned. Its manual correction logic keeps evaluating new evidence after a viewer corrects a mistaken mute.

![Portfolio case study](case-study.png)

## Run the standalone sample

Use Node.js 24 from the repository directory. The sample uses the standard library and runs offline.

```sh
node --test "windows/vision-fast/*.test.mjs"
```

37 offline detector tests passed on Windows and macOS.

This repository contains the windows detector components component of the larger project. I developed the project with AI assistance.

[Portfolio](https://Egrocket1.github.io) · [GitHub profile](https://github.com/Egrocket1)

[Windows detector source and test instructions](windows/README.md)

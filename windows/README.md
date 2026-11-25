# Windows detector components

These source files come from the Windows Commercial Viewer project. The JavaScript suite runs offline with Node.js 24 and uses synthetic observations and temporary fixtures.

From the repository root, run:

```sh
node --test "windows/vision-fast/*.test.mjs"
```

The break policy evaluates classifications, broadcast cues and return evidence to decide when audio should change. Correction holds handle manual feedback. A separate predictor estimates break risk without issuing a mute command. Transition evidence keeps a bounded set of before-and-after observations for debugging.

The C# fingerprint extractor uses NAudio to convert audio into short spectral hashes. The JavaScript matcher compares sequences of hashes to labeled references. Supply your own references to use that component. The Node test suite covers the policy and evidence modules. It does not build the C# source or measure live detection accuracy.

The hardware installation also uses capture services, paired devices and local configuration. This release runs the portable components independently.

# OpenSCAD Customizer

[Open the Demo](https://custom.wirs.ing/?src=https://raw.githubusercontent.com/zebreus/parametric-cat-ears/refs/heads/main/cat-ears.scad)

This is a stripped down version of [OpenSCAD playground](https://github.com/openscad/openscad-playground) with everything but the customizer removed. It also allows you to customize your own files from urls like `https://custom.wirs.ing/?src=<URL_TO_SCAD_FILE>`

Here is a working example link: https://custom.wirs.ing/?src=https://raw.githubusercontent.com/zebreus/parametric-cat-ears/refs/heads/main/cat-ears.scad

This project is really just [OpenSCAD playground](https://github.com/openscad/openscad-playground) so look at their Readme for more details. Also give them a star.

Licenses: see [LICENSES](./LICENSE).

## Features

- [Customizer!!!](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Customizer) support
- Preview
- Export to STL and other common formats

## Roadmap

- Rework layout to make it more fit for customizing only
- Improve mobile support
- Add shorter url

## Building

### Optional: Build your own openscad 

This fork already includes prebuild openscad wasm binaries to make deploying to github pages easier so you dont need to do this section.

Prerequisites:
*   wget
*   GNU make
*   npm
*   docker

First, you need a WASM build of [a branch](https://github.com/openscad/openscad/pull/5180) that handles colors & exports to GLTF (will take a while):

```bash
./build-openscad-wasm.sh -DCMAKE_BUILD_TYPE=Release
```

### Building the website

Local dev:

```bash
make public
npm start
# http://localhost:4000/
```

Local prod (test both the different inlining and serving under a prefix):

```bash
make public
npm run start:prod
# http://localhost:3000/dist/
```

```bash
make public
npm run build
```
# 67553 - Surface Modern Manageability

Surface Modern Manageability microsite based on [Foundation 6.5.0](https://github.com/zurb/foundation-sites) with updated dependencies.

## Changes
[CHANGELOG.md](CHANGELOG.md)

## URLs

### Staging
https://indigoslate.github.io/67553_Surface_Modern_Manageability/

### Live
https://surfacemodernmanagement.azurewebsites.net/

## Installation

- [NodeJS](https://nodejs.org/en/) >= v.10.5.0

### Setup

After cloning the repository, install `yarn`:

```bash
npm i -g yarn
```

and then install all dependencies:

```bash
yarn
```

Finally, run `yarn start` to run Gulp. Your finished site will be created in a folder called `dist`, viewable at this URL:

```
http://localhost:8000
```

To create compressed, production-ready assets, run `yarn run build`.

## Deployment

This website is depoloyed to an Azure instance. In order to update the page, we are using FTP. CI didn't work since one of the projects dependencies requires a 64bit Node instance and Azure is only running a 32bit instance.

In order to deploy to the FTP, just build the project:

```bash
yarn build
```

and then copy the content of the `dist`-folder to the server via FTP. The FTP credentials can be retrieved from the Deployment dashboard of the `surfacemodernmanagement`-subscription.

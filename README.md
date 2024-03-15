# This is the PIH monorepo for OpenMRS 3.x.

## Developer Setup

Check out the O3 developer documentation [here](http://o3-dev.docs.openmrs.org).

This monorepo uses [yarn](https://yarnpkg.com).  To install the dependancies, run:

```bash
yarn install
```

To start a dev server for a specific module, run:

```bash
yarn start --sources 'packages/esm-<insert-package-name>-app'
```

To do this with specific configuration, run:

```bash
yarn start --backend "http://localhost:8080/" --config-url "site/base-config.json" --config-url "site/config.json" --sources 'packages/esm-<insert-package-name>-app' --port 8081
```

You could provide `yarn start` with as many `sources` arguments as you require. For example:

```bash
yarn start --sources 'packages/esm-xxx-app' --sources 'packages/esm-yyy-app'
```

## Troubleshooting

If you notice that your local version of the application is not working or that there's a mismatch between what you see locally versus what's expected, you likely have outdated versions of core libraries. To update core libraries, run the following commands:

```bash
# Upgrade core libraries
yarn up openmrs @openmrs/esm-framework

# Reset version specifiers to `next`. Don't commit actual version numbers.
git checkout package.json

# Run `yarn` to recreate the lockfile
yarn
```

## Contributing

Please read the OpenMRS [contributing](http://o3-dev.docs.openmrs.org/#/getting_started/contributing) guide.

## Running tests

To run tests for all packages, run:

```bash
yarn turbo test
```

To run tests in `watch` mode, run:

```bash
yarn turbo test:watch
```

To run tests for a specific package, pass the package name to the `--filter` flag. For example, to run tests for `esm-patient-conditions-app`, run:

```bash
yarn turbo test --filter="esm-referral-queues-app"
```

To run a specific test file, run:

```bash
yarn turbo test -- referrals-queue
```

The above command will only run tests in the file or files that match the provided string.

You can also run the matching tests from above in watch mode
```

To generate a `coverage` report, run:

```bash
yarn turbo coverage
```

By default, `turbo` will cache test runs. This means that re-running tests without changing any of the related files will return the cached logs from the last run. To bypass the cache, run tests with the `force` flag, as follows:

```bash
yarn turbo test --force
```

## Design Patterns

For documentation about our design patterns, please visit the OpenMRS [design system](https://zeroheight.com/23a080e38/p/880723--introduction) documentation website.

## Configuration

This module is designed to be driven by configuration files.

## Version and release

To increment the version, run the following command:

```sh
yarn release
```

See [CI Github Action](.github/workflows/ci.yml) to view how builds are generated and pushed to NPM.

To do a release, you will need to pick the next version number. We use minor changes (e.g. `3.2.0` → `3.3.0`)
to indicate big new features and breaking changes, and patch changes (e.g. `3.2.0` → `3.2.1`) otherwise.

Note that this command will not create a new tag, nor publish the packages.  After running it, make a PR or merge to `main` with the resulting changeset.

Once the version bump is merged, go to GitHub and [draft a new release](https://github.com/PIH/openmrs-esm-pihemr/releases/new). 
The tag should be prefixed with `v` (e.g., `v3.2.1`), while the release title should just be the version number (e.g., `3.2.1`). 
The creation of the GitHub release will cause GitHub Actions to publish the packages, completing the release process.

> Don't run `npm publish` or `yarn publish`. Use the above process.

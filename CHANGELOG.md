# Changelog

## [0.10.2](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.10.1...v0.10.2) (2024-06-29)


### Bug Fixes

* SimpleNodeLambda didn't add policies. change BaseLambda API ([47ee752](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/47ee752af40ee111f84fb4bc4d4fd8c8746cb925))

## [0.10.1](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.10.0...v0.10.1) (2024-06-29)


### Bug Fixes

* BaseLambda optional type parameter ([b0c14ca](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/b0c14cab77861b623347dd150ebcdafaf57120b1))

## [0.10.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.9.4...v0.10.0) (2024-06-29)


### Features

* S3Artifact api change, added getS3ArtifactForBucket, better docs ([e6e5762](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/e6e57628c3bee809001901cf0e01a2209d2f99fe))

## [0.9.4](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.9.3...v0.9.4) (2024-06-28)


### Bug Fixes

* added missing export ([290827d](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/290827d209882c33a596cc6db0c847a67580bb9c))

## [0.9.3](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.9.2...v0.9.3) (2024-06-28)


### Bug Fixes

* lambda not using correct log group ([69eb0b5](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/69eb0b5e4ab4275ef16fb8ccb047d2fa7e4d7ad3))

## [0.9.2](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.9.1...v0.9.2) (2024-06-24)


### Bug Fixes

* added memorySize, timeout to SimpleNodeLambda ([aada2ad](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/aada2ad0232f583bd01389f91fbb4840c8c5a943))

## [0.9.1](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.9.0...v0.9.1) (2024-06-18)


### Bug Fixes

* SimpleNodeLambda using arm64 arch by default ([9e6b52d](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/9e6b52d2830f21ff647f1ec2f674fd4d2aa8a253))

## [0.9.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.8.0...v0.9.0) (2024-06-17)


### Features

* SimpleNodeLambda vpc support ([bfbe010](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/bfbe01064c17e999adeed5854c19c3cc03ee85ca))

## [0.8.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.7.0...v0.8.0) (2024-06-17)


### Features

* added SimpleNodeLambda, more docs ([066738d](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/066738dbbd986daf56f62655709fbaa07ef7a50c))

## [0.7.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.6.0...v0.7.0) (2024-06-07)


### Features

* integration of single assets ([f41ec09](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/f41ec0994995c982959523a3ec64d3ee79c835a2))


### Bug Fixes

* correctly expiring artifacts ([1ce68a4](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/1ce68a4c4c1d423daa8b48d0c994532bef9f0448))

## [0.6.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.5.0...v0.6.0) (2024-06-07)


### ⚠ BREAKING CHANGES

* grouped components into packages
* introduced S3ArtifactStore. StaticWebsite is no longer implicitly creating a bucket

### Features

* introduced S3ArtifactStore. StaticWebsite is no longer implicitly creating a bucket ([9380002](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/938000291a18ef34d203bfaba81358d2a01fee0b))


### Miscellaneous Chores

* grouped components into packages ([78a8443](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/78a84430eb23f161b053ec418d08673d2589bd97))

## [0.5.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.4.1...v0.5.0) (2024-06-06)


### Features

* added SesProxyMailer ([f21343d](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/f21343d2f82fcebd47fbb9cc053551585bc048cd))


### Bug Fixes

* Vpc public subnet cidr collision ([b83a790](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/b83a79060ef18f698ac33d6e091030db73a77ed3))

## [0.4.1](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.4.0...v0.4.1) (2024-06-06)


### Bug Fixes

* installing pulumi-s3-login as executable ([f34cfda](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/f34cfdaf56aa272e37035501400c3fe453011243))

## [0.4.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.3.0...v0.4.0) (2024-06-06)


### Features

* pulumi-s3-login script ([f6161b6](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/f6161b67f8f1433ddb4cf042a1da68ac9b31efd6))

## [0.3.0](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.2.3...v0.3.0) (2024-06-03)


### Features

* introduced Vpc and Website components ([b51798b](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/b51798bb827fa9cfd3e2ed990cfb3d5d4ac22cc2))

## [0.2.3](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.2.2...v0.2.3) (2024-06-02)


### Bug Fixes

* missing code in release ([f411724](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/f4117244efc24ce75c0f46e03d0c8e65f14a9989))

## [0.2.2](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.2.1...v0.2.2) (2024-06-02)


### Bug Fixes

* missing repo url ([3ecf16c](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/3ecf16c1c5cb59dab7b463e0e93a2c0a5ce16297))

## [0.2.1](https://github.com/smartstream-tv/pulumi-aws-toolbox/compare/v0.2.0...v0.2.1) (2024-06-02)


### Bug Fixes

* missing github permission ([9dfdab7](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/9dfdab7a826ff5f8c4c60abc44889b4aaaef280b))

## 0.2.0 (2024-06-02)


### Features

* npm publish ([b75431f](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/b75431f26527dd3d1093e7ab9e8de7026293ca1b))
* release-please integration ([a835a6d](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/a835a6d2fb303f6ad3b26686ba87fdaec1cb8a4c))
* ssm getSecret function, basic project setup ([da4c534](https://github.com/smartstream-tv/pulumi-aws-toolbox/commit/da4c534ecbb1dedbd2bee4abb0a1248ec4e32083))

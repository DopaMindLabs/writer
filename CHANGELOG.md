# Changelog

## [1.0.0-alpha](https://github.com/DopaMindLabs/writer/compare/v0.5.0...v1.0.0-alpha) (2026-06-11)


### ⚠ BREAKING CHANGES

* **ui:** the mobile bottom bar no longer offers a Split tab.
* **editor:** plain-text doc bodies are no longer accepted by word counting, plaintext extraction, markdown backup, or revision restore.

### Features

* add form component and its tests ([#42](https://github.com/DopaMindLabs/writer/issues/42)) ([f8eb2dc](https://github.com/DopaMindLabs/writer/commit/f8eb2dc1a8ab9267a4c61f0bb100bcc46ed42405))
* add picture uploads to brain dump notes ([#62](https://github.com/DopaMindLabs/writer/issues/62)) ([137bb4f](https://github.com/DopaMindLabs/writer/commit/137bb4f1e07fcce16f82f7cc8159641af8d8e76b))
* adopt NASA Power-of-Ten coding standards with ESLint enforcement ([#46](https://github.com/DopaMindLabs/writer/issues/46)) ([adb2de7](https://github.com/DopaMindLabs/writer/commit/adb2de703b18744ba42a0870d8794cc68646fd28))
* **backups:** allow create backup snapshots ([#32](https://github.com/DopaMindLabs/writer/issues/32)) ([306baa4](https://github.com/DopaMindLabs/writer/commit/306baa43fd5013ec35dedba1d7b746c8929deafd))
* **brainspace:** full-size image viewer and image cards ([#77](https://github.com/DopaMindLabs/writer/issues/77)) ([34caa83](https://github.com/DopaMindLabs/writer/commit/34caa83d613e1ce06c914af8750e2c5f39e2ca6c))
* **doc inspector:** implement Doc Inspector info pane with limits and status control ([#81](https://github.com/DopaMindLabs/writer/issues/81)) ([848c532](https://github.com/DopaMindLabs/writer/commit/848c5329997fe8c43914108ef3c811890be6730e))
* **doc-inspector:** build the outline pane from document headings ([#102](https://github.com/DopaMindLabs/writer/issues/102)) ([7f3809d](https://github.com/DopaMindLabs/writer/commit/7f3809da8fc762bcbcd96db06c3f57a5840ff3b5))
* **help:** add in-app Help Center with search and ⌘K overlay ([#63](https://github.com/DopaMindLabs/writer/issues/63)) ([5c02b8a](https://github.com/DopaMindLabs/writer/commit/5c02b8a50f2bc2f9f59e0c07ca10bcd83ae16d61))
* **help:** rewrite the docs and help centre ([#74](https://github.com/DopaMindLabs/writer/issues/74)) ([8a48499](https://github.com/DopaMindLabs/writer/commit/8a48499be0a3cce93455d171f85f3978d05c97d9))
* **i18n:** add translations to BrainSpace and Citations components ([#94](https://github.com/DopaMindLabs/writer/issues/94)) ([438e29c](https://github.com/DopaMindLabs/writer/commit/438e29c398be758b6249a880991a4e01ba006be9))
* **i18n:** support full ui and help translations ([#87](https://github.com/DopaMindLabs/writer/issues/87)) ([ebd27c3](https://github.com/DopaMindLabs/writer/commit/ebd27c3ce28d8709bd6332cf2e97a322a67e2361))
* **i18n:** translate chrome.json for 29 long-tail locales ([#89](https://github.com/DopaMindLabs/writer/issues/89)) ([a287d1f](https://github.com/DopaMindLabs/writer/commit/a287d1f48b298eaece7340e5f71e481157885e14))
* **i18n:** translate help articles to french ([#92](https://github.com/DopaMindLabs/writer/issues/92)) ([5c545ba](https://github.com/DopaMindLabs/writer/commit/5c545ba6528822001de05f6b1840c9be9a5b8204))
* **i18n:** translate help articles to german ([#93](https://github.com/DopaMindLabs/writer/issues/93)) ([58c2c02](https://github.com/DopaMindLabs/writer/commit/58c2c024eeb062d70804d713174115c54e854a87))
* **i18n:** translate screens.json for Tier-1 locales (fr de nl pt-BR pt-PT) ([#90](https://github.com/DopaMindLabs/writer/issues/90)) ([bebfaf2](https://github.com/DopaMindLabs/writer/commit/bebfaf254ddc707d0a8334e26666fd3bf12b3f48))
* **security:** pre-release security hardening ([#103](https://github.com/DopaMindLabs/writer/issues/103)) ([f86ff5d](https://github.com/DopaMindLabs/writer/commit/f86ff5dacf9e53c9a71045f408280d97a9ce0628))
* stack settings sections by group with scroll-spy navigation ([#72](https://github.com/DopaMindLabs/writer/issues/72)) ([efa4a51](https://github.com/DopaMindLabs/writer/commit/efa4a51fcdee1de2abae8793114c7ec4469c9b6e))
* **sync:** push-only local folder sync MVP ([#44](https://github.com/DopaMindLabs/writer/issues/44)) ([0be5744](https://github.com/DopaMindLabs/writer/commit/0be5744d9eb800da19498f43204fda933a734871))
* **ui:** add Button and Chip components with variant and size support ([ad5733f](https://github.com/DopaMindLabs/writer/commit/ad5733f59f41e6b40bfc76cc66789d8a971f899a))
* **ui:** improve user navigation, flow and backup functionality ([#33](https://github.com/DopaMindLabs/writer/issues/33)) ([9c4219d](https://github.com/DopaMindLabs/writer/commit/9c4219dca529bd2a40ec59093bc38e3603f3c91f))
* **ui:** templates and mobile view update ([#101](https://github.com/DopaMindLabs/writer/issues/101)) ([20f9580](https://github.com/DopaMindLabs/writer/commit/20f95802c6bf14b3e962efbc99dac0b83e941fc6))
* **versioning:** per-document version history, diff, and rollback ([#79](https://github.com/DopaMindLabs/writer/issues/79)) ([64f0590](https://github.com/DopaMindLabs/writer/commit/64f0590a0dbe7596a4b9ff3883b95f45466a9ab2))


### Bug Fixes

* **build:** resolve pre-existing TypeScript build errors ([#45](https://github.com/DopaMindLabs/writer/issues/45)) ([ef42dc7](https://github.com/DopaMindLabs/writer/commit/ef42dc79829af286efdbba61142f86a4e007744f))
* cache word counts and optimise autosave, sync, and attachment queries ([#84](https://github.com/DopaMindLabs/writer/issues/84)) ([d98f760](https://github.com/DopaMindLabs/writer/commit/d98f7609eb813bb87db605989babcc33613c14a7))
* **editor:** save pending autosave flush to the doc it was typed in ([#97](https://github.com/DopaMindLabs/writer/issues/97)) ([9f8c0e0](https://github.com/DopaMindLabs/writer/commit/9f8c0e0513321bd7c9c861df30f9c2aac7b69d66))
* **i18n:** type partial resources helper for i18next Resource ([#98](https://github.com/DopaMindLabs/writer/issues/98)) ([62dc022](https://github.com/DopaMindLabs/writer/commit/62dc022b0e88037d36f50ca9d2b7403efa7934c3))
* **spaces:** keep chrome mounted when switching spaces ([#75](https://github.com/DopaMindLabs/writer/issues/75)) ([80473f6](https://github.com/DopaMindLabs/writer/commit/80473f61f1e0723b500001efcca4769a3a22f31a))
* **spaces:** redirect to the switched-to space's own first document ([#78](https://github.com/DopaMindLabs/writer/issues/78)) ([b1c03fc](https://github.com/DopaMindLabs/writer/commit/b1c03fc6d94921d7166c5e02dbced7f40ff28c91))

## [0.5.0](https://github.com/DopaMindLabs/writer/compare/v0.4.2...v0.5.0) (2026-05-14)


### Features

* add BrainSpaceDetailDrawer component with tests ([18fcff7](https://github.com/DopaMindLabs/writer/commit/18fcff79401d232b58cf79fe4cdc49959608125a))
* add comprehensive tests for TemplatesScreen, WriteScreen, and UI store functionality ([48c1ac9](https://github.com/DopaMindLabs/writer/commit/48c1ac93d190a37ec6bdf6209ef1b10d13c7b0a8))
* add GitHub Actions workflow for deploying from tags ([6b11f88](https://github.com/DopaMindLabs/writer/commit/6b11f884e47086e73bb7a6753056d708461e9e81))
* add home page ([f0c3f04](https://github.com/DopaMindLabs/writer/commit/f0c3f0495c4c82cae83a917d0781854ae0048f0b))
* add mobile viewport tests for settings screens and ensure no horizontal overflow ([e6ee41c](https://github.com/DopaMindLabs/writer/commit/e6ee41c201d907a27fd94a5b1f0989504ff44030))
* add Settings screen with navigation, tabs, and settings management ([4cc2d5d](https://github.com/DopaMindLabs/writer/commit/4cc2d5dc8e5785626f3310f2116fe3141d8422bf))
* add template versioning and ui improvements ([8cf5622](https://github.com/DopaMindLabs/writer/commit/8cf56222153d8a9b5e2a5e2b9cfd0fc2002a079f))
* **citations:** enhance citation management with bulk actions and improved editing features ([5a5a691](https://github.com/DopaMindLabs/writer/commit/5a5a691f04516a625f202ba2c398044f9c9d8d88))
* enhance author parsing to support name particles and multiple authors ([7c67408](https://github.com/DopaMindLabs/writer/commit/7c67408757863a524d324128fc4c9a48363c9226))
* enhance CitationsSidePanel with navigation and expand functionality; add sidebar to CitationsScreen ([1f7274b](https://github.com/DopaMindLabs/writer/commit/1f7274bdf11f55cffa43494093438fd41e0c3dc7))
* enhance Home screen with tooltip for status line warnings ([8e47832](https://github.com/DopaMindLabs/writer/commit/8e478323648b549c952f6d59af60e9a6b9c6ec7a))
* enhance ModeToggle and Topbar components with tooltips and focus mode functionality ([9fa1126](https://github.com/DopaMindLabs/writer/commit/9fa11267da33ed334ef530aa55a37d62945c5db8))
* enhance space settings with new tabs and delete functionality ([9f99fc2](https://github.com/DopaMindLabs/writer/commit/9f99fc2839a16053fdc1711893e8e387adc48e3d))
* fix tests ([9ad2efb](https://github.com/DopaMindLabs/writer/commit/9ad2efb28f8c5132cd0e68ebe8bc0c454e797287))
* **i18n:** integrate i18next for internationalization support ([c9c9b47](https://github.com/DopaMindLabs/writer/commit/c9c9b47315087c8e88a700c742670273f9390847))
* implement editable document name in Topbar with keyboard interactions ([5991197](https://github.com/DopaMindLabs/writer/commit/5991197c7ef1b16a287a420362b53f93f9af2c33))
* implement floating toolbar for text formatting and add related settings ([683e7be](https://github.com/DopaMindLabs/writer/commit/683e7beee8aaacb4ee747cc41be11deab49742a6))
* improve ui and add templates ([3263237](https://github.com/DopaMindLabs/writer/commit/3263237bdbbe428564317443da6a78f9bfc0a8a0))
* initial version of the app ([4ec873d](https://github.com/DopaMindLabs/writer/commit/4ec873df89605c82e4d418f60459511342e2df14))
* integrate citations panel across various screens and enhance UI state management ([d11b89c](https://github.com/DopaMindLabs/writer/commit/d11b89c3ccd67e6eb22bce001ccd6f6e7a4dbf31))
* minor UI enhancements ([855e660](https://github.com/DopaMindLabs/writer/commit/855e660f172210e4429ee4319f80e3535ab68757))
* mobile support ([245fe2a](https://github.com/DopaMindLabs/writer/commit/245fe2a3202e7bbc695034b6e58004ade3c22890))
* refactor BrainSpaceNote to manage editing state and add context menu for note actions ([26b072f](https://github.com/DopaMindLabs/writer/commit/26b072f067880e98bcb385de17d8ee7db1124d9b))
* rename "dump" to "space" in various components and update related logic ([0ce2e72](https://github.com/DopaMindLabs/writer/commit/0ce2e729b10f13525943b8e6407ad31754b28632))
* reorder seedDocs in fiction template for improved manuscript flow ([f34008d](https://github.com/DopaMindLabs/writer/commit/f34008dfa46752c013cb35be333c33c77fc3aa23))
* set up CI/CD pipeline ([3a0a07e](https://github.com/DopaMindLabs/writer/commit/3a0a07e1b844b4e6205c7e1575d30da0b9a2181f))
* small improvements ([710ff33](https://github.com/DopaMindLabs/writer/commit/710ff331893f2355a928f668da5e5e50b336bb33))
* small improvements for content and themes ([9de2978](https://github.com/DopaMindLabs/writer/commit/9de2978b9f473697b6343989e864f5872cb52572))
* **tours:** implement guided tours for various screens and components ([8bb6f15](https://github.com/DopaMindLabs/writer/commit/8bb6f151114dc590fa1a7efa9052f12c82f8f907))
* update name convention ([17662ff](https://github.com/DopaMindLabs/writer/commit/17662ff619d5f708157b8954873edf117e3ee327))
* update naming convetion ([9b30da6](https://github.com/DopaMindLabs/writer/commit/9b30da6e08a376a3f89dec3589a5e4b086587182))
* update template status ([cfc2c6b](https://github.com/DopaMindLabs/writer/commit/cfc2c6ba3c904ed80975d989640efd1c236fb9df))
* update the github url ([4f488ba](https://github.com/DopaMindLabs/writer/commit/4f488ba328367eb776996e121e005b5529be7058))
* update Vite config for dynamic base path and add GitHub Pages deployment workflow ([57166bf](https://github.com/DopaMindLabs/writer/commit/57166bf3dced125ca8219ee82a6eda8f6a8f272a))


### Bug Fixes

* fix test coverage ([3472e60](https://github.com/DopaMindLabs/writer/commit/3472e60f544fa5bcb2bde857531715adcde1bdb1))
* routes ([1161391](https://github.com/DopaMindLabs/writer/commit/11613915723d2fc66479a07b67add64189cd04d8))
* update PostCSS configuration and Tailwind CSS imports ([6c75c53](https://github.com/DopaMindLabs/writer/commit/6c75c53ea3e1b28f2d1fe7799b49551b97fa415c))
* update schema to include linkedDocId in Note interface ([18fcff7](https://github.com/DopaMindLabs/writer/commit/18fcff79401d232b58cf79fe4cdc49959608125a))

## [0.4.2](https://github.com/DopaMindLabs/writer/compare/v0.4.1...v0.4.2) (2026-05-14)


### Bug Fixes

* update PostCSS configuration and Tailwind CSS imports ([6c75c53](https://github.com/DopaMindLabs/writer/commit/6c75c53ea3e1b28f2d1fe7799b49551b97fa415c))

## [0.4.1](https://github.com/DopaMindLabs/writer/compare/v0.3.0...v0.4.1) (2026-05-14)


### Features

* add mobile viewport tests for settings screens and ensure no horizontal overflow ([e6ee41c](https://github.com/DopaMindLabs/writer/commit/e6ee41c201d907a27fd94a5b1f0989504ff44030))
* **citations:** enhance citation management with bulk actions and improved editing features ([5a5a691](https://github.com/DopaMindLabs/writer/commit/5a5a691f04516a625f202ba2c398044f9c9d8d88))
* enhance author parsing to support name particles and multiple authors ([7c67408](https://github.com/DopaMindLabs/writer/commit/7c67408757863a524d324128fc4c9a48363c9226))
* enhance CitationsSidePanel with navigation and expand functionality; add sidebar to CitationsScreen ([1f7274b](https://github.com/DopaMindLabs/writer/commit/1f7274bdf11f55cffa43494093438fd41e0c3dc7))
* **tours:** implement guided tours for various screens and components ([8bb6f15](https://github.com/DopaMindLabs/writer/commit/8bb6f151114dc590fa1a7efa9052f12c82f8f907))

## [0.3.0](https://github.com/DopaMindLabs/writer/compare/v0.2.0...v0.3.0) (2026-05-14)


### Features

* add BrainSpaceDetailDrawer component with tests ([18fcff7](https://github.com/DopaMindLabs/writer/commit/18fcff79401d232b58cf79fe4cdc49959608125a))
* add comprehensive tests for TemplatesScreen, WriteScreen, and UI store functionality ([48c1ac9](https://github.com/DopaMindLabs/writer/commit/48c1ac93d190a37ec6bdf6209ef1b10d13c7b0a8))
* add Settings screen with navigation, tabs, and settings management ([4cc2d5d](https://github.com/DopaMindLabs/writer/commit/4cc2d5dc8e5785626f3310f2116fe3141d8422bf))
* enhance Home screen with tooltip for status line warnings ([8e47832](https://github.com/DopaMindLabs/writer/commit/8e478323648b549c952f6d59af60e9a6b9c6ec7a))
* enhance ModeToggle and Topbar components with tooltips and focus mode functionality ([9fa1126](https://github.com/DopaMindLabs/writer/commit/9fa11267da33ed334ef530aa55a37d62945c5db8))
* enhance space settings with new tabs and delete functionality ([9f99fc2](https://github.com/DopaMindLabs/writer/commit/9f99fc2839a16053fdc1711893e8e387adc48e3d))
* **i18n:** integrate i18next for internationalization support ([c9c9b47](https://github.com/DopaMindLabs/writer/commit/c9c9b47315087c8e88a700c742670273f9390847))
* implement editable document name in Topbar with keyboard interactions ([5991197](https://github.com/DopaMindLabs/writer/commit/5991197c7ef1b16a287a420362b53f93f9af2c33))
* implement floating toolbar for text formatting and add related settings ([683e7be](https://github.com/DopaMindLabs/writer/commit/683e7beee8aaacb4ee747cc41be11deab49742a6))
* integrate citations panel across various screens and enhance UI state management ([d11b89c](https://github.com/DopaMindLabs/writer/commit/d11b89c3ccd67e6eb22bce001ccd6f6e7a4dbf31))
* refactor BrainSpaceNote to manage editing state and add context menu for note actions ([26b072f](https://github.com/DopaMindLabs/writer/commit/26b072f067880e98bcb385de17d8ee7db1124d9b))
* rename "dump" to "space" in various components and update related logic ([0ce2e72](https://github.com/DopaMindLabs/writer/commit/0ce2e729b10f13525943b8e6407ad31754b28632))
* reorder seedDocs in fiction template for improved manuscript flow ([f34008d](https://github.com/DopaMindLabs/writer/commit/f34008dfa46752c013cb35be333c33c77fc3aa23))


### Bug Fixes

* update schema to include linkedDocId in Note interface ([18fcff7](https://github.com/DopaMindLabs/writer/commit/18fcff79401d232b58cf79fe4cdc49959608125a))

## [0.2.0](https://github.com/DopaMindLabs/writer/compare/v0.1.0...v0.2.0) (2026-05-14)


### Features

* add home page ([f0c3f04](https://github.com/DopaMindLabs/writer/commit/f0c3f0495c4c82cae83a917d0781854ae0048f0b))
* add template versioning and ui improvements ([8cf5622](https://github.com/DopaMindLabs/writer/commit/8cf56222153d8a9b5e2a5e2b9cfd0fc2002a079f))
* fix tests ([9ad2efb](https://github.com/DopaMindLabs/writer/commit/9ad2efb28f8c5132cd0e68ebe8bc0c454e797287))
* improve ui and add templates ([3263237](https://github.com/DopaMindLabs/writer/commit/3263237bdbbe428564317443da6a78f9bfc0a8a0))
* initial version of the app ([4ec873d](https://github.com/DopaMindLabs/writer/commit/4ec873df89605c82e4d418f60459511342e2df14))
* minor UI enhancements ([855e660](https://github.com/DopaMindLabs/writer/commit/855e660f172210e4429ee4319f80e3535ab68757))
* mobile support ([245fe2a](https://github.com/DopaMindLabs/writer/commit/245fe2a3202e7bbc695034b6e58004ade3c22890))
* set up CI/CD pipeline ([3a0a07e](https://github.com/DopaMindLabs/writer/commit/3a0a07e1b844b4e6205c7e1575d30da0b9a2181f))
* small improvements ([710ff33](https://github.com/DopaMindLabs/writer/commit/710ff331893f2355a928f668da5e5e50b336bb33))
* small improvements for content and themes ([9de2978](https://github.com/DopaMindLabs/writer/commit/9de2978b9f473697b6343989e864f5872cb52572))
* update name convention ([17662ff](https://github.com/DopaMindLabs/writer/commit/17662ff619d5f708157b8954873edf117e3ee327))
* update naming convetion ([9b30da6](https://github.com/DopaMindLabs/writer/commit/9b30da6e08a376a3f89dec3589a5e4b086587182))
* update template status ([cfc2c6b](https://github.com/DopaMindLabs/writer/commit/cfc2c6ba3c904ed80975d989640efd1c236fb9df))
* update the github url ([4f488ba](https://github.com/DopaMindLabs/writer/commit/4f488ba328367eb776996e121e005b5529be7058))
* update Vite config for dynamic base path and add GitHub Pages deployment workflow ([57166bf](https://github.com/DopaMindLabs/writer/commit/57166bf3dced125ca8219ee82a6eda8f6a8f272a))


### Bug Fixes

* routes ([1161391](https://github.com/DopaMindLabs/writer/commit/11613915723d2fc66479a07b67add64189cd04d8))

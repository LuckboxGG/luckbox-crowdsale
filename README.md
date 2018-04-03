# Luckbox Crowdsale Smart Contracts

This repository contains the Luckbox Crowdsale smart contracts.

## Availability

The crowdsale and token contracts were deployed on the Ethereum main net on 03 April 2018 and are available at the following addresses:

* https://etherscan.io/token/0x82adce3b6a226f9286af99841410b04a075b54d5 - LuckCashToken
* https://etherscan.io/address/0xb0fe6581875550421ed1fe4a9ea717fa4fb97308 - LuckCashCrowdsale
* https://etherscan.io/address/0x317b8c7b9a879c22c78e4251ff00848039b4936b - WhiteListRegistry

## Exploring

If you feel like exploring how the smart contracts work for yourself, feel free to try them out on your own private development net.

1. Clone this repository.

2. Install all system dependencies.

```sh
npm install
```

3. Compile contract code

```sh
truffle compile
```

4. Run the personal blockchain for development opting to have the accounts with many ether

```sh
ganache-cli --account="0xee4e871def4e297da77f99d57de26000e86077528847341bc637d2543f8db6e2,10000000000000000000000000" --account="0x4be9f21ddd88e9e66a526d8dbb00d27f6d7b977a186eb5baa87e896087a6055f,10000000000000000000000000" --account="0x09e775e9aa0ac5b5e1fd0d0bca00e2ef429dc5f5130ea769ba14be0163021f16, 10000000000000000000000000" --account="0xed055c1114c433f95d688c8d5e460d3e5d807544c5689af262451f1699ff684f, 10000000000000000000000000" --account="0x3f81b14d33f5eb597f9ad2c350716ba8f2b6c073eeec5fdb807d23c85cf05794,10000000000000000000000000" --account="0x501a3382d37d113b6490e3c4dda0756afb65df2d7977ede59618233c787239f2,10000000000000000000000000" --account="0x3d00e5c06597298b7d70c6fa3ac5dae376ff897763333db23c226d14d48333af, 10000000000000000000000000" --account="0xc00db81e42db65485d6ce98d727f12f2ace251cbf7b24a932c3afd3a356876ad, 10000000000000000000000000" --account="0xd6f7d873e7349c6d522455cb3ebdaa50b525dc6fd34f96b9e09e2d8a22dce925, 10000000000000000000000000" --account="0x13c8853ac12e9e30fda9f070fafe776031cc4d13bee88d7ad4e099601d83c594, 10000000000000000000000000"
```

5. Deployment

```sh
truffle deploy --reset --network development
```
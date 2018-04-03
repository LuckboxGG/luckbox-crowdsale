const Wallet = require('ethereumjs-wallet');
const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
const Web3 = require("web3");

class WalletProvider {
  constructor(privateKey, provider_url, address_index) {
    this.privateKey = new Buffer(privateKey, 'hex');
    this.wallet = Wallet.fromPrivateKey(this.privateKey);
    this.address = "0x" + this.wallet.getAddressString();

    this.engine = new ProviderEngine();
    this.engine.addProvider(new WalletSubprovider(this.wallet, {}));
    this.engine.addProvider(new FiltersSubprovider());
    this.engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(provider_url)));
    this.engine.start(); // Required by the provider engine.
  }

  sendAsync() {
    this.engine.sendAsync.apply(this.engine, arguments);
  }

  send() {
    return this.engine.send.apply(this.engine, arguments);
  };

  getAddress() {
    return this.address;
  };
}

module.exports = WalletProvider;

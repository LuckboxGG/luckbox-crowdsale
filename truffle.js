const WalletProvider = require('./utils/WalletProvider');

// TODO: replace with real private key
const privateKey = 'privatekeygoeshere';
const infuraToken = 'infuratokengoeshere';

module.exports = {
  migrations_directory: './migrations',
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      gas: 7000000,
      network_id: '*'
    },
    rinkeby: {
      provider: new WalletProvider(privateKey, `https://rinkeby.infura.io/${infuraToken}`),
      network_id: 4,
      gas: 7000000,
      gasPrice: 20000000000
    },
    mainnet: {
      provider: new WalletProvider(privateKey, `https://mainnet.infura.io/${infuraToken}`),
      network_id: 1,
      gas: 7000000,
      gasPrice: 20000000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

const LuckCashCrowdsale = artifacts.require('./LuckCashCrowdsale.sol');
const WhiteListRegistry = artifacts.require('./WhiteListRegistry.sol');
const Settings = require('../utils/settings');

const BigNumber = web3.BigNumber;

module.exports = async function(deployer, network, [_, wallet]) {
    return deployer
    .then(() => {
        return deployer.deploy(WhiteListRegistry);
    })
    .then(() => {
        return deployer.deploy(
            LuckCashCrowdsale,
            Settings.startTime,
            Settings.endTime,
            new BigNumber('5687'), // 1 ETH buys 5687 LCK
            Settings.wallet,
            WhiteListRegistry.address
        );      
    });
};

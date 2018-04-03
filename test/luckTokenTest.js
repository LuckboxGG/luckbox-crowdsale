const LuckCashToken = artifacts.require('./LuckCashToken.sol');
const LuckCashCrowdsale = artifacts.require('./LuckCashCrowdsale.sol');
const WhiteListRegistry = artifacts.require('./WhiteListRegistry.sol');
const VestingFund = artifacts.require('./VestingFund.sol');

const timer = require('./helpers/timer');
const BigNumber = web3.BigNumber;

function isException(error) {
    let strError = error.toString()
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert')
}

function ensuresException(error) {
    assert(isException(error), error.toString())
}

/** Returns last block's timestamp */
function getBlockNow() {
    return web3.eth.getBlock(web3.eth.blockNumber).timestamp // base timestamp off the blockchain
}

contract(
    'LuckTokenCrowdsale',
    (
        [
            owner,
            wallet,
            contributor,
            impostorContributor,
            privateContributor,
            privateContributor2,
            team,
            investor,
            otherGuy
        ]
    ) => {
        var mLuckCashCrowdsale = null;
        var mWhiteListRegistry = null;
        var mToken = null;

        var startTime, endTime;
        var rate = new BigNumber(500);
        const dayInSecs = 86400;
        const duration = 60 * dayInSecs;

        function newCrowdsale(_rate) {
            startTime = getBlockNow() + 20;
            endTime = startTime + duration // 60 days

            return WhiteListRegistry.deployed().then(whitelistRegistry => {
                mWhiteListRegistry = whitelistRegistry;
                return LuckCashCrowdsale.new(startTime, endTime, _rate, wallet, mWhiteListRegistry.address);
            });
        }

        beforeEach('initialize contract', async () => {
            mLuckCashCrowdsale = await newCrowdsale(rate);
            mToken = LuckCashToken.at(await mLuckCashCrowdsale.token());
        });

        describe('test contracts deployment', () => {

            it('should test that contracts are deployed', async () => {
                assert.notEqual(mLuckCashCrowdsale, null, "crowdsale not deployed");
                assert.notEqual(mWhiteListRegistry, null, "whitelist not deployed");
                assert.notEqual(mToken, null, "token not deployed");
            });

            it('should test that only owner can modify the reconciliation date', async () => {
               await mLuckCashCrowdsale.setReconciliationDate(5);
               try{
                await mLuckCashCrowdsale.setReconciliationDate(6,{from : impostorContributor});
                assert.fail();
               }catch(e){
                   ensuresException(e);
               }
            });

            it('starts with token paused', async () => {
                const paused = await mToken.paused();
                paused.should.be.true;
            });

            it('token is unpaused after crowdsale ends', async () => {
                let paused = await mToken.paused();
                paused.should.be.true;

                timer(duration + 30);
                await mLuckCashCrowdsale.finalize();

                paused = await mToken.paused();
                paused.should.be.false;
            });

            it('should test that crowdsale parameters are correct', async () => {
                startTime.should.be.bignumber.equal(await mLuckCashCrowdsale.startTime());
                endTime.should.be.bignumber.equal(await mLuckCashCrowdsale.endTime());
                rate.should.be.bignumber.equal(await mLuckCashCrowdsale.rate());
            });

            it('finishes minting when crowdsale is finalized', async () => {
                timer(duration + 30);
                let finishMinting = await mToken.mintingFinished();
                finishMinting.should.be.false;
                await mLuckCashCrowdsale.finalize();
                finishMinting = await mToken.mintingFinished();
                finishMinting.should.be.true;
            });
        });

        describe('test contributions and whitelist', () => {
            var contribution = 1e18; // wei
            var maxTokens = contribution * 600000000;
            var minContribution = 1e17;
            var maxContribution = 1e19;

            it('should allow contributors to be whitelisted', async () => {
                var isWhiteListed = await mWhiteListRegistry.isWhiteListed(impostorContributor);
                isWhiteListed.should.be.false;

                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);

                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;
            });

            it('should not allow listed contributors to buy tokens before start', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                try {
                    await timer(-100);
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: contribution, from: contributor });
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }

                var balance = await mToken.balanceOf(contributor);
                balance.should.be.bignumber.equal(0);
            });

            it('should not allow listed contributors to buy tokens after end', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                try {
                    await timer(duration + 30);
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: contribution, from: contributor });
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }

                var balance = await mToken.balanceOf(contributor);
                balance.should.be.bignumber.equal(0);
            });

            it('should not allow unlisted contributors to buy tokens', async () => {
                try {
                    await timer(100);
                    await mLuckCashCrowdsale.buyTokens(impostorContributor, { value: contribution, from: impostorContributor });
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }

                var balance = await mToken.balanceOf(impostorContributor);
                balance.should.be.bignumber.equal(0);
            });

            it('should allow whitelisted contributors to buy tokens', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                await timer(100);

                await mLuckCashCrowdsale.buyTokens(contributor, { value: contribution, from: contributor });

                var balance = await mToken.balanceOf(contributor);
                balance.should.be.bignumber.equal(contribution * rate);
            });

            it('should not allow transfer to the wallet untill the finalize() function has been called', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                await timer(100);
                var coldWallet = await mLuckCashCrowdsale.wallet();
                var balanceBeforeBuy = await web3.eth.getBalance(coldWallet);
                await mLuckCashCrowdsale.buyTokens(contributor, { value: contribution, from: contributor });
                var balanceBeforeFinalizeButAfterBuy = await web3.eth.getBalance(coldWallet);
                balanceBeforeFinalizeButAfterBuy.should.be.bignumber.equal(balanceBeforeBuy);
                timer(duration + 30);
                await mLuckCashCrowdsale.finalize();
                var balanceAfter = await web3.eth.getBalance(coldWallet);
                balanceAfter.should.be.bignumber.equal(balanceBeforeBuy.plus(contribution));
            });

            it('should allow whitelisted contributors to send ether -> buy tokens', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, minContribution, maxContribution);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                await timer(100);
                await mLuckCashCrowdsale.sendTransaction({ value: contribution, from: contributor });

                var balance = await mToken.balanceOf(contributor);
                balance.should.be.bignumber.equal(contribution * rate);
            });

            it('should allow whitelisted contributors to send ether -> buy tokens only if contributtion is within user min/max cap', async () => {
                await mWhiteListRegistry.addToWhiteList(contributor, 3, 5);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                await timer(100);
                try{
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: 2, from: contributor });
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }

                try{
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: 6, from: contributor });
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }

                await mLuckCashCrowdsale.buyTokens(contributor, { value: 5, from: contributor });

                try{
                    // will exceed cap
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: 5, from: contributor });
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }

            });

            it('should not allow contributor to buy tokens after crowdsale cap is reached', async () => {
                const highrate = new BigNumber(1e10); // use high rate so we can reach the cap with a low amount of ether
                const crowdsaleCap = await mLuckCashCrowdsale.CAP();
                const maxCrowdsale = crowdsaleCap.div(highrate).sub(1);
                await mWhiteListRegistry.addToWhiteList(contributor, 9, maxCrowdsale);
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(contributor);
                isWhiteListed.should.be.true;

                mLuckCashCrowdsale = await newCrowdsale(highrate);
                mToken = LuckCashToken.at(await mLuckCashCrowdsale.token());


                await timer(100);
                await mLuckCashCrowdsale.buyTokens(contributor, { value: maxCrowdsale, from: contributor });

                var balance = await mToken.balanceOf(contributor);
                balance.toNumber().should.be.closeTo(maxTokens, 1);
                
                try {
                    await timer(100, {mine: true});
                    await mLuckCashCrowdsale.buyTokens(contributor, { value: 10, from: contributor });
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                    balance = await mToken.balanceOf(contributor);
                    balance.toNumber().should.be.closeTo(maxTokens, 1);
                }

            });

            it('should not allow minting tokens after token cap is reached', async () => {
                const rate = 1e18; // use high rate so we can reach the cap with a low amount of ether
                await mWhiteListRegistry.addToWhiteList(investor, 9, (new BigNumber(600000000 * 1e18 * 34).dividedBy(100)));
                isWhiteListed = await mWhiteListRegistry.isWhiteListed(investor);
                isWhiteListed.should.be.true;

                mLuckCashCrowdsale = await newCrowdsale(rate);
                mToken = LuckCashToken.at(await mLuckCashCrowdsale.token());


                await timer(100);

                
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 27).dividedBy(100), 0);
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 10).dividedBy(100), 1);
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 20).dividedBy(100), 2);
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 3).dividedBy(100), 3);
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 3).dividedBy(100), 4);
                await mLuckCashCrowdsale.mintTokensFor(investor,  new BigNumber(600000000 * 1e18 * 3).dividedBy(100), 5);

                await mLuckCashCrowdsale.buyTokens(investor, { value: (new BigNumber(600000000 * 34).dividedBy(100)), from: investor });


                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(maxTokens);

                const totalSupply = await mToken.totalSupply();
                totalSupply.should.be.bignumber.equal(maxTokens);

                try {
                    await timer(100, {mine: true});
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                    balance = await mToken.balanceOf(investor);
                    balance.should.be.bignumber.equal(maxTokens);
                }

                try{
                    await mLuckCashCrowdsale.buyTokens(investor, { value: 1, from: investor });
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow minting tokens for private investors when amount is 0', async () => {
                try {
                    await timer(100);
                    await mLuckCashCrowdsale.mintTokensFor(investor, 0, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                    balance = await mToken.balanceOf(investor);
                    balance.should.be.bignumber.equal(0);
                }
            });

            it('should not allow minting tokens for private investors when address is 0', async () => {
                try {
                    await timer(100);
                    await mLuckCashCrowdsale.mintTokensFor(0, 10, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                    balance = await mToken.balanceOf(investor);
                    balance.should.be.bignumber.equal(0);
                }
            });

            it('should not allow minting tokens for private investors after crowdsale has finalised', async () => {
                timer(duration + 30);
                await mLuckCashCrowdsale.finalize();
                try {                    
                    await mLuckCashCrowdsale.mintTokensFor(investor, 10, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                    balance = await mToken.balanceOf(investor);
                    balance.should.be.bignumber.equal(0);
                }
            });

            it('should allow minting tokens for private investors', async () => {
                await mLuckCashCrowdsale.mintTokensFor(investor, 10, 1);

                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(10);
            });

            it('should not allow minting tokens for strategic investors over the 27% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 27);
                var strategicInvestorCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, strategicInvestorCap,0);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(strategicInvestorCap);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,0);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow minting tokens for company reserve over the 10% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 10);
                var companyReserveCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, companyReserveCap,1);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(companyReserveCap);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,1);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow minting tokens for user adoption pool over the 20% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 20);
                var userAdoptionPool = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, userAdoptionPool,2);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(userAdoptionPool);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,2);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow minting tokens for team pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var teamPoolCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, teamPoolCap,3);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(teamPoolCap);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,3);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow minting tokens for advisors pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var advisorsPoolCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, advisorsPoolCap,4);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(advisorsPoolCap);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,4);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });


            it('should not allow minting tokens for promo pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var promoPoolCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.mintTokensFor(investor, promoPoolCap,5);
                var balance = await mToken.balanceOf(investor);
                balance.should.be.bignumber.equal(promoPoolCap);
                try{
                    await mLuckCashCrowdsale.mintTokensFor(investor, 1,5);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });
        });

        describe('test vest funds', () => {
            var quarters = 3;
            var amount = 100;
            it('should not create vesting fund for 0x0', async () => {
                try {
                    await mLuckCashCrowdsale.createVestFundFor(0, amount, quarters, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }
            });

            it('should not vest null amount', async () => {
                try {
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 0, quarters, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }
            });

            it('should not vest for null quarters', async () => {
                try {
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, 0, 1);
                    assert.fail();
                } catch (e) {
                    ensuresException(e);
                }
            });

            it('should check vest fund parameters', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);
                var events = await watcher.get();
                events.length.should.be.equal(1);
                var event = events[0];
                event.args.beneficiary.should.be.equal(privateContributor);
                var vestFund = event.args.fund;
                const benef = await VestingFund.at(vestFund).beneficiary();
                benef.should.be.equal(privateContributor);
                const quart = await VestingFund.at(vestFund).quarters();
                quart.should.be.bignumber.equal(quarters);
                const balance = await mToken.balanceOf(vestFund);
                balance.should.be.bignumber.equal(amount);
            });

            it('should be able to mint tokens for vesting fund', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);

                var events = await watcher.get();
                var event = events[0];
                var vestFund = event.args.fund;
                vestFund = await VestingFund.at(vestFund);

                const vested = await vestFund.vestedAmount();
                vested.should.be.bignumber.equal(0);

                const releasable = await vestFund.releasableAmount();
                releasable.should.be.bignumber.equal(0);

                const released = await vestFund.released();
                released.should.be.bignumber.equal(0);
            });

            it('should not be able to get tokens before vesting period starts', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);

                var events = await watcher.get();
                var event = events[0];
                var vestFund = event.args.fund;
                vestFund = await VestingFund.at(vestFund);

                await timer(30, { mine: true });

                const vested = await vestFund.vestedAmount();
                vested.should.be.bignumber.equal(0);
            });

            it('should vest tokens accordingly', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);

                var daysInQuarter = 90;

                var events = await watcher.get();
                var event = events[0];
                var vestFund = event.args.fund;
                vestFund = await VestingFund.at(vestFund);

                await timer(duration + 30, { mine: true });

                for (var qPassed = 1; qPassed <= quarters; qPassed++) {
                    await timer(daysInQuarter * dayInSecs, { mine: true }); // move forward a quarter

                    var val = qPassed ? amount * qPassed / quarters : 0;
                    const vested = await vestFund.vestedAmount();
                    vested.should.be.bignumber.equal(Math.floor(val));
                }
            });

            it('should release tokens accordingly', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);

                var daysInQuarter = 90;

                var events = await watcher.get();
                var event = events[0];
                var vestFund = event.args.fund;
                vestFund = await VestingFund.at(vestFund);

                await timer(duration + 30, { mine: true });
                await mLuckCashCrowdsale.finalize(); // must finalize so we can transfer tokens
                var released = 0;

                for (var qPassed = 1; qPassed <= quarters; qPassed++) {
                    await timer(daysInQuarter * dayInSecs, { mine: true }); // move forward a quarter

                    var val = qPassed ? amount * qPassed / quarters : 0;

                    const vested = await vestFund.vestedAmount();
                    vested.should.be.bignumber.equal(Math.floor(val));

                    // actually release the tokens and check beneficiary
                    await vestFund.release();
                    var released = await mToken.balanceOf(privateContributor);
                    released.should.be.bignumber.equal(Math.floor(val));
                }
            });
            it('should not allow vesting tokens for strategic investors over the 27% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 27);
                var strategicInvestorCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, strategicInvestorCap, quarters, 0);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 0);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow vesting tokens for company reserve over the 10% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 10);
                var companyReserveCap = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, companyReserveCap, quarters, 1);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 1);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow vesting tokens for user adoption pool over the 20% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 20);
                var userAdoptionPool = temp.dividedBy(100); //todo here
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, userAdoptionPool, quarters, 2);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 2);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow vesting tokens for team pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var teamPoolCap = temp.dividedBy(100); 
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, teamPoolCap, quarters, 3);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 3);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow vesting tokens for advisors pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var advisorsPoolCap = temp.dividedBy(100); 
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, advisorsPoolCap, quarters, 4);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 4);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });


            it('should not allow vesting tokens for promo pool over the 3% cap', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 3);
                var promoPoolCap = temp.dividedBy(100);
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, promoPoolCap, quarters, 5);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, 1, quarters, 5);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
            });

            it('should not allow vesting tokens for user adoption pool over the 20% cap untill crowdsale finishes and has leftovers', async () => {
                var temp = new BigNumber(600000000 * 1e18 * 20);
                var userAdoptionPool = temp.dividedBy(100); 
                temp = new BigNumber(600000000 * 1e18 * 34);
                var crowdsalePool = temp.dividedBy(100); 
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, userAdoptionPool, quarters, 2);
                try{
                    await mLuckCashCrowdsale.createVestFundFor(privateContributor, crowdsalePool, quarters, 2);
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
                await timer(duration + 30, { mine: true });
                await mLuckCashCrowdsale.transferFromCrowdsaleToUserAdoptionPool();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor2, crowdsalePool, quarters, 2);

            });

            it('should call finalize after reconciliation', async () => {
                var watcher = mLuckCashCrowdsale.VestedTokensFor();
                await mLuckCashCrowdsale.createVestFundFor(privateContributor, amount, quarters, 1);

                var daysInQuarter = 90;

                var events = await watcher.get();
                var event = events[0];
                var vestFund = event.args.fund;
                vestFund = await VestingFund.at(vestFund);
                
                var reconciliationTime = duration + 30+ 90*dayInSecs;
                await timer(duration + 30, { mine: true });

                try{
                    await mLuckCashCrowdsale.finalize({from: otherGuy}); // must finalize so we can transfer tokens
                    assert.fail();
                }catch(e){
                    ensuresException(e);
                }
                await mLuckCashCrowdsale.setReconciliationDate(getBlockNow() + 30*dayInSecs);
                await timer(100+ 30*dayInSecs, { mine: true });
                await mLuckCashCrowdsale.finalize({from: otherGuy}); // must finalize so we can transfer tokens
            });
        });

    }
);

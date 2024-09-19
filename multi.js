import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SELECTED_NETWORKS = process.env.SELECTED_NETWORKS.split(',');
const RPC_URLS = SELECTED_NETWORKS.reduce((acc, network) => {
    acc[network] = Object.keys(process.env)
        .filter(key => key.startsWith(`${network}_RPC_URL_`))
        .map(key => process.env[key]);
    return acc;
}, {});

const MNEMONIC_TEMPLATE = process.env.MNEMONIC_WORDS ? process.env.MNEMONIC_WORDS.trim().split(/\s+/) : [];
const FIXED_ORDER = process.env.FIXED_ORDER === 'true';

function getRandomProvider(network) {
    const urls = RPC_URLS[network];
    const randomUrl = urls[Math.floor(Math.random() * urls.length)];
    return new ethers.JsonRpcProvider(randomUrl);
}

const fullTemplate = Array(12).fill('*').map((word, index) => 
    index < MNEMONIC_TEMPLATE.length ? MNEMONIC_TEMPLATE[index] : '*'
);

console.log(`註記詞模板: ${fullTemplate.join(' ')} | 固定顺序: ${FIXED_ORDER}`);

const generatedMnemonics = new Set();

function generateCompleteMnemonic() {
    let mnemonic;
    do {
        const randomMnemonic = bip39.generateMnemonic(128);
        const randomWords = randomMnemonic.split(' ');
        
        if (FIXED_ORDER) {
            mnemonic = fullTemplate.map((word, index) => {
                return word !== '*' ? word : randomWords[index];
            });
        } else {
            mnemonic = randomWords.slice();
            const fixedWords = MNEMONIC_TEMPLATE.filter(word => word !== '*');
            for (let i = 0; i < fixedWords.length; i++) {
                const randomIndex = Math.floor(Math.random() * 12);
                mnemonic[randomIndex] = fixedWords[i];
            }
        }
        
        mnemonic = mnemonic.join(' ');
    } while (generatedMnemonics.has(mnemonic));
    
    generatedMnemonics.add(mnemonic);
    return mnemonic;
}

async function checkBalances(wallet) {
    const balances = {};
    for (const network of SELECTED_NETWORKS) {
        try {
            const provider = getRandomProvider(network);
            const balance = await provider.getBalance(wallet.address);
            balances[network] = balance;
        } catch (error) {
            console.error(`檢查 ${network} 餘額時錯誤:`, error.message);
            balances[network] = ethers.parseEther("0");
        }
    }
    return balances;
}

async function main() {
    let attempts = 0;
    let validAttempts = 0;

    console.log("程式开始運行...");

    while (true) {
        attempts++;
        const mnemonic = generateCompleteMnemonic();
        if (!bip39.validateMnemonic(mnemonic)) {
            continue;
        }

        validAttempts++;
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        
        const balances = await checkBalances(wallet);
        
        const balanceString = Object.entries(balances)
            .map(([network, balance]) => `${network}: ${ethers.formatEther(balance)} ETH`)
            .join(' | ');
        
        process.stdout.write(`\r嘗試: ${attempts} | 有效: ${validAttempts} | 地址: ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)} | ${balanceString}`);

        if (Object.values(balances).some(balance => balance > 0)) {
            console.log("\n找到非零餘額！");
            console.log("最終註記詞:", mnemonic);
            console.log("詳細餘額:");
            for (const [network, balance] of Object.entries(balances)) {
                if (balance > 0) {
                    console.log(`${network}: ${ethers.formatEther(balance)} ETH`);
                }
            }
            break;
        }
    }
}

main().catch(console.error);
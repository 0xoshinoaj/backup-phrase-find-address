import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SELECTED_NETWORK = process.env.SELECTED_NETWORK;
const RPC_URLS = Object.keys(process.env)
    .filter(key => key.startsWith(`${SELECTED_NETWORK}_RPC_URL_`))
    .map(key => process.env[key]);

if (RPC_URLS.length === 0) {
    console.error(`錯誤：${SELECTED_NETWORK} 的 RPC URL 未設置。請檢查 .env 文件。`);
    process.exit(1);
}

const MNEMONIC_TEMPLATE = process.env.MNEMONIC_WORDS ? process.env.MNEMONIC_WORDS.trim().split(/\s+/) : [];
const FIXED_ORDER = process.env.FIXED_ORDER === 'true';

const fullTemplate = Array(12).fill('*').map((word, index) => 
    index < MNEMONIC_TEMPLATE.length ? MNEMONIC_TEMPLATE[index] : '*'
);

console.log(`註記詞模板: ${fullTemplate.join(' ')} | 固定顺序: ${FIXED_ORDER}`);

const generatedMnemonics = new Set();

function getRandomProvider() {
    const randomUrl = RPC_URLS[Math.floor(Math.random() * RPC_URLS.length)];
    return new ethers.JsonRpcProvider(randomUrl);
}

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

async function checkBalance(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        return null;
    }
    try {
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        const provider = getRandomProvider();
        const balance = await provider.getBalance(wallet.address);
        return { wallet, balance };
    } catch (error) {
        console.error("檢查餘額時錯誤:", error.message);
        return null;
    }
}

async function main() {
    let attempts = 0;
    let validAttempts = 0;

    console.log("程式開始運行...");

    while (true) {
        attempts++;
        const mnemonic = generateCompleteMnemonic();

        const result = await checkBalance(mnemonic);
        if (!result) {
            continue;
        }

        validAttempts++;
        const { wallet, balance } = result;
        
        process.stdout.write(`\r嘗試: ${attempts} | 有效: ${validAttempts} | 地址: ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)} | ${SELECTED_NETWORK}: ${ethers.formatEther(balance)} ETH`);

        if (balance > 0) {
            console.log("\n找到非零餘額！");
            console.log("最終註記詞:", mnemonic);
            console.log(`${SELECTED_NETWORK}: ${ethers.formatEther(balance)} ETH`);
            break;
        }
    }
}

main().catch(console.error);
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const NETWORKS = {
    ETH: process.env.ETH_RPC_URL,
    ARBITRUM: process.env.ARBITRUM_RPC_URL,
    OPTIMISM: process.env.OPTIMISM_RPC_URL,
    POLYGON: process.env.POLYGON_RPC_URL
};

async function main() {
    const modeAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: '請選擇執行模式:',
            choices: ['單鏈查詢', '多多鏈查詢']
        }
    ]);

    let selectedNetworks;

    if (modeAnswer.mode === '單鏈查詢') {
        const networkAnswer = await inquirer.prompt([
            {
                type: 'list',
                name: 'network',
                message: '請選擇要查詢的鏈:',
                choices: Object.keys(NETWORKS)
            }
        ]);
        selectedNetworks = [networkAnswer.network];
    } else {
        const networksAnswer = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'networks',
                message: '請選擇要查詢的鏈(可複選):',
                choices: Object.keys(NETWORKS),
                instructions: '(按 <空格> 選擇，<a> 全選/取消全選，<i> 反選，<Enter> 確認)'
            }
        ]);
        selectedNetworks = networksAnswer.networks;
    }

    // 更新 .env 文件
    let envContent = fs.readFileSync('.env', 'utf8');
    Object.keys(NETWORKS).forEach(network => {
        const regex = new RegExp(`^${network}_RPC_URL=.*$`, 'm');
        if (selectedNetworks.includes(network)) {
            envContent = envContent.replace(regex, `${network}_RPC_URL=${NETWORKS[network]}`);
        } else {
            envContent = envContent.replace(regex, `${network}_RPC_URL=`);
        }
    });
    fs.writeFileSync('.env', envContent);

    // 执行相应的脚本
    if (modeAnswer.mode === '單鏈查詢') {
        console.log(`正在執行單鏈查詢 (${selectedNetworks[0]})...`);
        process.env.SELECTED_NETWORK = selectedNetworks[0];
        execSync(`node single.js`, { stdio: 'inherit', env: process.env });
    } else {
        console.log(`正在執行單鏈查詢 (${selectedNetworks.join(', ')})...`);
        process.env.SELECTED_NETWORKS = selectedNetworks.join(',');
        execSync(`node multi.js`, { stdio: 'inherit', env: process.env });
    }
}

main().catch(console.error);
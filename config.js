import dotenv from 'dotenv';

dotenv.config();

// 定義支持的網絡
const NETWORKS = ['ETH', 'ARBITRUM', 'OPTIMISM', 'POLYGON'];

// 為每個網絡創建 RPC URL 列表
export const RPC_URLS = NETWORKS.reduce((acc, network) => {
    acc[network] = Object.keys(process.env)
        .filter(key => key.startsWith(`${network}_RPC_URL_`))
        .map(key => process.env[key])
        .filter(url => url); // 過濾掉未定義的 URL
    return acc;
}, {});

// 獲取指定網絡的隨機 RPC URL
export function getRandomRpcUrl(network) {
    if (!RPC_URLS[network] || RPC_URLS[network].length === 0) {
        throw new Error(`未設置 ${network} 的 RPC URL`);
    }
    return RPC_URLS[network][Math.floor(Math.random() * RPC_URLS[network].length)];
}

// 獲取所有已配置的網絡
export function getConfiguredNetworks() {
    return Object.keys(RPC_URLS).filter(network => RPC_URLS[network].length > 0);
}

// 如果需要，您可以保留這個函數用於向後兼容
export function getRpcUrl() {
    console.warn("警告：getRpcUrl() 已棄用，請使用 getRandomRpcUrl(network) 代替");
    return getRandomRpcUrl('ETH');
}